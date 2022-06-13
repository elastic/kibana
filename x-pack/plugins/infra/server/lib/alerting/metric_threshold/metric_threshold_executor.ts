/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { first, isEqual, last } from 'lodash';
import moment from 'moment';
import {
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
  RecoveredActionGroup,
} from '../../../../../alerting/common';
import { Alert, AlertTypeState as RuleTypeState } from '../../../../../alerting/server';
import { AlertStates, Comparator } from '../../../../common/alerting/metrics';
import { createFormatter } from '../../../../common/formatters';
import { InfraBackendLibs } from '../../infra_types';
import {
  buildErrorAlertReason,
  buildFiredAlertReason,
  buildInvalidQueryAlertReason,
  buildNoDataAlertReason,
  // buildRecoveredAlertReason,
  stateToAlertMessage,
} from '../common/messages';
import { UNGROUPED_FACTORY_KEY, getViewInAppUrl } from '../common/utils';
import { LINK_TO_METRICS_EXPLORER } from '../../../../common/alerting/metrics';

import { EvaluatedRuleParams, evaluateRule } from './lib/evaluate_rule';
import { TimeUnitChar } from '../../../../../observability/common/utils/formatters/duration';

export type MetricThresholdRuleParams = Record<string, any>;
export type MetricThresholdRuleTypeState = RuleTypeState & {
  groups: string[];
  groupBy?: string | string[];
  filterQuery?: string;
};
export type MetricThresholdAlertState = AlertState; // no specific instace state used
export type MetricThresholdAlertContext = AlertContext; // no specific instace state used

type MetricThresholdAllowedActionGroups = ActionGroupIdsOf<
  typeof FIRED_ACTIONS | typeof WARNING_ACTIONS
>;

type MetricThresholdAlert = Alert<
  MetricThresholdAlertState,
  MetricThresholdAlertContext,
  MetricThresholdAllowedActionGroups
>;

type MetricThresholdAlertFactory = (
  id: string,
  reason: string,
  threshold?: number | undefined,
  value?: number | undefined
) => MetricThresholdAlert;

export const createMetricThresholdExecutor = (libs: InfraBackendLibs) =>
  libs.metricsRules.createLifecycleRuleExecutor<
    MetricThresholdRuleParams,
    MetricThresholdRuleTypeState,
    MetricThresholdAlertState,
    MetricThresholdAlertContext,
    MetricThresholdAllowedActionGroups
  >(async function (options) {
    const { services, params, state } = options;
    const { criteria } = params;
    if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');
    const { alertWithLifecycle, savedObjectsClient } = services;
    const alertFactory: MetricThresholdAlertFactory = (id, reason) =>
      alertWithLifecycle({
        id,
        fields: {
          [ALERT_REASON]: reason,
        },
      });

    const {
      sourceId,
      alertOnNoData,
      alertOnGroupDisappear: _alertOnGroupDisappear,
    } = params as {
      sourceId?: string;
      alertOnNoData: boolean;
      alertOnGroupDisappear: boolean | undefined;
    };

    if (!params.filterQuery && params.filterQueryText) {
      try {
        const { fromKueryExpression } = await import('@kbn/es-query');
        fromKueryExpression(params.filterQueryText);
      } catch (e) {
        const timestamp = moment().toISOString();
        const actionGroupId = FIRED_ACTIONS.id; // Change this to an Error action group when able
        const reason = buildInvalidQueryAlertReason(params.filterQueryText);
        const alert = alertFactory(UNGROUPED_FACTORY_KEY, reason);
        alert.scheduleActions(actionGroupId, {
          group: UNGROUPED_FACTORY_KEY,
          alertState: stateToAlertMessage[AlertStates.ERROR],
          reason,
          viewInAppUrl: getViewInAppUrl(libs.basePath, LINK_TO_METRICS_EXPLORER),
          timestamp,
          value: null,
          metric: mapToConditionsLookup(criteria, (c) => c.metric),
        });
        return { groups: [], groupBy: params.groupBy, filterQuery: params.filterQuery };
      }
    }

    // For backwards-compatibility, interpret undefined alertOnGroupDisappear as true
    const alertOnGroupDisappear = _alertOnGroupDisappear !== false;

    const source = await libs.sources.getSourceConfiguration(
      savedObjectsClient,
      sourceId || 'default'
    );
    const config = source.configuration;
    const compositeSize = libs.configuration.alerting.metric_threshold.group_by_page_size;

    const previousGroupBy = state.groupBy;
    const previousFilterQuery = state.filterQuery;
    const prevGroups =
      alertOnGroupDisappear &&
      isEqual(previousGroupBy, params.groupBy) &&
      isEqual(previousFilterQuery, params.filterQuery)
        ? // Filter out the * key from the previous groups, only include it if it's one of
          // the current groups. In case of a groupBy alert that starts out with no data and no
          // groups, we don't want to persist the existence of the * alert instance
          state.groups?.filter((g) => g !== UNGROUPED_FACTORY_KEY) ?? []
        : [];

    const alertResults = await evaluateRule(
      services.scopedClusterClient.asCurrentUser,
      params as EvaluatedRuleParams,
      config,
      prevGroups,
      compositeSize
    );

    // Because each alert result has the same group definitions, just grab the groups from the first one.
    const resultGroups = Object.keys(first(alertResults)!);
    // Merge the list of currently fetched groups and previous groups, and uniquify them. This is necessary for reporting
    // no data results on groups that get removed
    const groups = [...new Set([...prevGroups, ...resultGroups])];

    const hasGroups = !isEqual(groups, [UNGROUPED_FACTORY_KEY]);
    for (const group of groups) {
      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = alertResults.every((result) =>
        // Grab the result of the most recent bucket
        last(result[group].shouldFire)
      );
      const shouldAlertWarn = alertResults.every((result) => last(result[group].shouldWarn));
      // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
      // whole alert is in a No Data/Error state
      const isNoData = alertResults.some((result) => last(result[group].isNoData));
      const isError = alertResults.some((result) => result[group].isError);

      const nextState = isError
        ? AlertStates.ERROR
        : isNoData
        ? AlertStates.NO_DATA
        : shouldAlertFire
        ? AlertStates.ALERT
        : shouldAlertWarn
        ? AlertStates.WARNING
        : AlertStates.OK;

      let reason;
      if (nextState === AlertStates.ALERT || nextState === AlertStates.WARNING) {
        reason = alertResults
          .map((result) =>
            buildFiredAlertReason({
              ...formatAlertResult(result[group], nextState === AlertStates.WARNING),
              group,
            })
          )
          .join('\n');
        /*
         * Custom recovery actions aren't yet available in the alerting framework
         * Uncomment the code below once they've been implemented
         * Reference: https://github.com/elastic/kibana/issues/87048
         */
        // } else if (nextState === AlertStates.OK && prevState?.alertState === AlertStates.ALERT) {
        // reason = alertResults
        //   .map((result) => buildRecoveredAlertReason(formatAlertResult(result[group])))
        //   .join('\n');
      }

      /* NO DATA STATE HANDLING
       *
       * - `alertOnNoData` does not indicate IF the alert's next state is No Data, but whether or not the user WANTS TO BE ALERTED
       *   if the state were No Data.
       * - `alertOnGroupDisappear`, on the other hand, determines whether or not it's possible to return a No Data state
       *   when a group disappears.
       *
       * This means we need to handle the possibility that `alertOnNoData` is false, but `alertOnGroupDisappear` is true
       *
       * nextState === NO_DATA would be true on both { '*': No Data } or, e.g. { 'a': No Data, 'b': OK, 'c': OK }, but if the user
       * has for some reason disabled `alertOnNoData` and left `alertOnGroupDisappear` enabled, they would only care about the latter
       * possibility. In this case, use hasGroups to determine whether to alert on a potential No Data state
       *
       * If `alertOnNoData` is true but `alertOnGroupDisappear` is false, we don't need to worry about the {a, b, c} possibility.
       * At this point in the function, a false `alertOnGroupDisappear` would already have prevented group 'a' from being evaluated at all.
       */
      if (alertOnNoData || (alertOnGroupDisappear && hasGroups)) {
        // In the previous line we've determined if the user is interested in No Data states, so only now do we actually
        // check to see if a No Data state has occurred
        if (nextState === AlertStates.NO_DATA) {
          reason = alertResults
            .filter((result) => result[group].isNoData)
            .map((result) => buildNoDataAlertReason({ ...result[group], group }))
            .join('\n');
        } else if (nextState === AlertStates.ERROR) {
          reason = alertResults
            .filter((result) => result[group].isError)
            .map((result) => buildErrorAlertReason(result[group].metric))
            .join('\n');
        }
      }

      if (reason) {
        const firstResult = first(alertResults);
        const timestamp = (firstResult && firstResult[group].timestamp) ?? moment().toISOString();
        const actionGroupId =
          nextState === AlertStates.OK
            ? RecoveredActionGroup.id
            : nextState === AlertStates.WARNING
            ? WARNING_ACTIONS.id
            : FIRED_ACTIONS.id;
        const alert = alertFactory(`${group}`, reason);
        alert.scheduleActions(actionGroupId, {
          group,
          alertState: stateToAlertMessage[nextState],
          reason,
          viewInAppUrl: getViewInAppUrl(libs.basePath, LINK_TO_METRICS_EXPLORER),
          timestamp,
          value: mapToConditionsLookup(
            alertResults,
            (result) => formatAlertResult(result[group]).currentValue
          ),
          threshold: mapToConditionsLookup(
            alertResults,
            (result) => formatAlertResult(result[group]).threshold
          ),
          metric: mapToConditionsLookup(criteria, (c) => c.metric),
        });
      }
    }
    return { groups, groupBy: params.groupBy, filterQuery: params.filterQuery };
  });

export const FIRED_ACTIONS = {
  id: 'metrics.threshold.fired',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.fired', {
    defaultMessage: 'Alert',
  }),
};

export const WARNING_ACTIONS = {
  id: 'metrics.threshold.warning',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.warning', {
    defaultMessage: 'Warning',
  }),
};

const mapToConditionsLookup = (
  list: any[],
  mapFn: (value: any, index: number, array: any[]) => unknown
) =>
  list
    .map(mapFn)
    .reduce(
      (result: Record<string, any>, value, i) => ({ ...result, [`condition${i}`]: value }),
      {}
    );

const formatAlertResult = <AlertResult>(
  alertResult: {
    metric: string;
    currentValue: number;
    threshold: number[];
    comparator: Comparator;
    warningThreshold?: number[];
    warningComparator?: Comparator;
    timeSize: number;
    timeUnit: TimeUnitChar;
  } & AlertResult,
  useWarningThreshold?: boolean
) => {
  const { metric, currentValue, threshold, comparator, warningThreshold, warningComparator } =
    alertResult;
  const noDataValue = i18n.translate(
    'xpack.infra.metrics.alerting.threshold.noDataFormattedValue',
    {
      defaultMessage: '[NO DATA]',
    }
  );
  if (!metric.endsWith('.pct'))
    return {
      ...alertResult,
      currentValue: currentValue ?? noDataValue,
    };
  const formatter = createFormatter('percent');
  const thresholdToFormat = useWarningThreshold ? warningThreshold! : threshold;
  const comparatorToFormat = useWarningThreshold ? warningComparator! : comparator;

  return {
    ...alertResult,
    currentValue:
      currentValue !== null && typeof currentValue !== 'undefined'
        ? formatter(currentValue)
        : noDataValue,
    threshold: Array.isArray(thresholdToFormat)
      ? thresholdToFormat.map((v: number) => formatter(v))
      : thresholdToFormat,
    comparator: comparatorToFormat,
  };
};
