/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { TypeOf } from '@kbn/config-schema';
import {
  ALERT_ACTION_GROUP,
  ALERT_EVALUATION_VALUES,
  ALERT_REASON,
  ALERT_GROUP,
} from '@kbn/rule-data-utils';
import { LocatorPublic } from '@kbn/share-plugin/common';
import {
  ActionGroupIdsOf,
  AlertInstanceState as AlertState,
  RecoveredActionGroup,
} from '@kbn/alerting-plugin/common';
import { Alert, RuleTypeState } from '@kbn/alerting-plugin/server';
import { IBasePath, Logger } from '@kbn/core/server';
import { LifecycleRuleExecutor } from '@kbn/rule-registry-plugin/server';
import { AlertsLocatorParams, getAlertUrl } from '../../../../common';
import { ObservabilityConfig } from '../../..';
import { AlertStates, searchConfigurationSchema } from './types';
import { FIRED_ACTIONS, NO_DATA_ACTIONS } from './translations';

import {
  buildFiredAlertReason,
  buildNoDataAlertReason,
  // buildRecoveredAlertReason,
} from './messages';
import {
  createScopedLogger,
  AdditionalContext,
  getContextForRecoveredAlerts,
  UNGROUPED_FACTORY_KEY,
  hasAdditionalContext,
  validGroupByForContext,
  flattenAdditionalContext,
  getFormattedGroupBy,
} from './utils';

import { formatAlertResult } from './lib/format_alert_result';
import { EvaluatedRuleParams, evaluateRule } from './lib/evaluate_rule';
import { MissingGroupsRecord } from './lib/check_missing_group';
import { convertStringsToMissingGroupsRecord } from './lib/convert_strings_to_missing_groups_record';

export type SearchConfigurationType = TypeOf<typeof searchConfigurationSchema>;
export type MetricThresholdRuleParams = Record<string, any>;
export type MetricThresholdRuleTypeState = RuleTypeState & {
  lastRunTimestamp?: number;
  missingGroups?: Array<string | MissingGroupsRecord>;
  groupBy?: string | string[];
  searchConfiguration?: SearchConfigurationType;
};
export type MetricThresholdAlertState = AlertState; // no specific instance state used

export interface MetricThresholdAlertContext extends Record<string, unknown> {
  alertDetailsUrl: string;
  group?: object;
  reason?: string;
  timestamp: string; // ISO string
  // String type is for [NO DATA]
  value?: Array<number | string | null>;
}

export const FIRED_ACTIONS_ID = 'custom_threshold.fired';
export const NO_DATA_ACTIONS_ID = 'custom_threshold.nodata';

type MetricThresholdActionGroup =
  | typeof FIRED_ACTIONS_ID
  | typeof NO_DATA_ACTIONS_ID
  | typeof RecoveredActionGroup.id;

type MetricThresholdAllowedActionGroups = ActionGroupIdsOf<
  typeof FIRED_ACTIONS | typeof NO_DATA_ACTIONS
>;

type MetricThresholdAlert = Alert<
  MetricThresholdAlertState,
  MetricThresholdAlertContext,
  MetricThresholdAllowedActionGroups
>;

export type Group = Array<{
  field: string;
  value: string;
}>;

type MetricThresholdAlertFactory = (
  id: string,
  reason: string,
  actionGroup: MetricThresholdActionGroup,
  additionalContext?: AdditionalContext | null,
  evaluationValues?: Array<number | null>,
  group?: Group
) => MetricThresholdAlert;

export const createMetricThresholdExecutor = ({
  alertsLocator,
  basePath,
  logger,
  config,
}: {
  basePath: IBasePath;
  logger: Logger;
  config: ObservabilityConfig;
  alertsLocator?: LocatorPublic<AlertsLocatorParams>;
}): LifecycleRuleExecutor<
  MetricThresholdRuleParams,
  MetricThresholdRuleTypeState,
  MetricThresholdAlertState,
  MetricThresholdAlertContext,
  MetricThresholdAllowedActionGroups
> =>
  async function (options) {
    const startTime = Date.now();

    const {
      services,
      params,
      state,
      startedAt,
      executionId,
      spaceId,
      rule: { id: ruleId },
      getTimeRange,
    } = options;

    const { criteria } = params;
    if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');
    const thresholdLogger = createScopedLogger(logger, 'thresholdRule', {
      alertId: ruleId,
      executionId,
    });

    // TODO: check if we need to use "savedObjectsClient"=> https://github.com/elastic/kibana/issues/159340
    const {
      alertWithLifecycle,
      getAlertUuid,
      getAlertByAlertUuid,
      getAlertStartedDate,
      searchSourceClient,
    } = services;

    const alertFactory: MetricThresholdAlertFactory = (
      id,
      reason,
      actionGroup,
      additionalContext,
      evaluationValues,
      group
    ) =>
      alertWithLifecycle({
        id,
        fields: {
          [ALERT_REASON]: reason,
          [ALERT_ACTION_GROUP]: actionGroup,
          [ALERT_EVALUATION_VALUES]: evaluationValues,
          [ALERT_GROUP]: group,
          ...flattenAdditionalContext(additionalContext),
        },
      });

    const { alertOnNoData, alertOnGroupDisappear: _alertOnGroupDisappear } = params as {
      alertOnNoData: boolean;
      alertOnGroupDisappear: boolean | undefined;
    };

    // For backwards-compatibility, interpret undefined alertOnGroupDisappear as true
    const alertOnGroupDisappear = _alertOnGroupDisappear !== false;
    const compositeSize = config.customThresholdRule.groupByPageSize;
    const queryIsSame = isEqual(
      state.searchConfiguration?.query.query,
      params.searchConfiguration.query.query
    );
    const groupByIsSame = isEqual(state.groupBy, params.groupBy);
    const previousMissingGroups =
      alertOnGroupDisappear && queryIsSame && groupByIsSame && state.missingGroups
        ? state.missingGroups
        : [];

    const initialSearchSource = await searchSourceClient.create(params.searchConfiguration!);
    const dataView = initialSearchSource.getField('index')!.getIndexPattern();
    const timeFieldName = initialSearchSource.getField('index')?.timeFieldName;
    if (!dataView) {
      throw new Error('No matched data view');
    } else if (!timeFieldName) {
      throw new Error('The selected data view does not have a timestamp field');
    }

    // Calculate initial start and end date with no time window, as each criteria has it's own time window
    const { dateStart, dateEnd } = getTimeRange();
    const alertResults = await evaluateRule(
      services.scopedClusterClient.asCurrentUser,
      params as EvaluatedRuleParams,
      dataView,
      timeFieldName,
      compositeSize,
      alertOnGroupDisappear,
      logger,
      { end: dateEnd, start: dateStart },
      state.lastRunTimestamp,
      convertStringsToMissingGroupsRecord(previousMissingGroups)
    );

    const resultGroupSet = new Set<string>();
    for (const resultSet of alertResults) {
      for (const group of Object.keys(resultSet)) {
        resultGroupSet.add(group);
      }
    }

    const groupByKeysObjectMapping = getFormattedGroupBy(params.groupBy, resultGroupSet);
    const groups = [...resultGroupSet];
    const nextMissingGroups = new Set<MissingGroupsRecord>();
    const hasGroups = !isEqual(groups, [UNGROUPED_FACTORY_KEY]);
    let scheduledActionsCount = 0;

    // The key of `groups` is the alert instance ID.
    for (const group of groups) {
      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = alertResults.every((result) => result[group]?.shouldFire);
      // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
      // whole alert is in a No Data/Error state
      const isNoData = alertResults.some((result) => result[group]?.isNoData);

      if (isNoData && group !== UNGROUPED_FACTORY_KEY) {
        nextMissingGroups.add({ key: group, bucketKey: alertResults[0][group].bucketKey });
      }

      const nextState = isNoData
        ? AlertStates.NO_DATA
        : shouldAlertFire
        ? AlertStates.ALERT
        : AlertStates.OK;

      let reason;
      if (nextState === AlertStates.ALERT) {
        reason = buildFiredAlertReason(alertResults, group, dataView);
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
            .filter((result) => result[group]?.isNoData)
            .map((result) => buildNoDataAlertReason({ ...result[group], group }))
            .join('\n');
        }
      }

      if (reason) {
        const timestamp = startedAt.toISOString();
        const actionGroupId: MetricThresholdActionGroup =
          nextState === AlertStates.OK
            ? RecoveredActionGroup.id
            : nextState === AlertStates.NO_DATA
            ? NO_DATA_ACTIONS_ID
            : FIRED_ACTIONS_ID;

        const additionalContext = hasAdditionalContext(params.groupBy, validGroupByForContext)
          ? alertResults && alertResults.length > 0
            ? alertResults[0][group].context ?? {}
            : {}
          : {};

        additionalContext.tags = Array.from(
          new Set([...(additionalContext.tags ?? []), ...options.rule.tags])
        );

        const evaluationValues = alertResults.reduce((acc: Array<number | null>, result) => {
          if (result[group]) {
            acc.push(result[group].currentValue);
          }
          return acc;
        }, []);

        const alert = alertFactory(
          `${group}`,
          reason,
          actionGroupId,
          additionalContext,
          evaluationValues,
          groupByKeysObjectMapping[group]
        );
        const alertUuid = getAlertUuid(group);
        const indexedStartedAt = getAlertStartedDate(group) ?? startedAt.toISOString();
        scheduledActionsCount++;

        alert.scheduleActions(actionGroupId, {
          alertDetailsUrl: await getAlertUrl(
            alertUuid,
            spaceId,
            indexedStartedAt,
            alertsLocator,
            basePath.publicBaseUrl
          ),
          group: groupByKeysObjectMapping[group],
          reason,
          timestamp,
          value: alertResults.map((result, index) => {
            const evaluation = result[group];
            if (!evaluation && criteria[index].aggType === 'count') {
              return 0;
            } else if (!evaluation) {
              return null;
            }
            return formatAlertResult(evaluation).currentValue;
          }),
          ...additionalContext,
        });
      }
    }
    const { getRecoveredAlerts } = services.alertFactory.done();
    const recoveredAlerts = getRecoveredAlerts();

    const groupByKeysObjectForRecovered = getFormattedGroupBy(
      params.groupBy,
      new Set<string>(recoveredAlerts.map((recoveredAlert) => recoveredAlert.getId()))
    );

    for (const alert of recoveredAlerts) {
      const recoveredAlertId = alert.getId();
      const alertUuid = getAlertUuid(recoveredAlertId);
      const timestamp = startedAt.toISOString();
      const indexedStartedAt = getAlertStartedDate(recoveredAlertId) ?? timestamp;

      const alertHits = alertUuid ? await getAlertByAlertUuid(alertUuid) : undefined;
      const additionalContext = getContextForRecoveredAlerts(alertHits);

      alert.setContext({
        alertDetailsUrl: await getAlertUrl(
          alertUuid,
          spaceId,
          indexedStartedAt,
          alertsLocator,
          basePath.publicBaseUrl
        ),
        group: groupByKeysObjectForRecovered[recoveredAlertId],
        timestamp: startedAt.toISOString(),
        ...additionalContext,
      });
    }

    const stopTime = Date.now();
    thresholdLogger.debug(
      `Scheduled ${scheduledActionsCount} actions in ${stopTime - startTime}ms`
    );
    return {
      state: {
        lastRunTimestamp: startedAt.valueOf(),
        missingGroups: [...nextMissingGroups],
        groupBy: params.groupBy,
        searchConfiguration: params.searchConfiguration,
      },
    };
  };
