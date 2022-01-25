/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import {
  ActionGroupIdsOf,
  AlertInstanceState as AlertState,
  AlertInstanceContext as AlertContext,
} from '../../../../../alerting/common';
import {
  AlertTypeState as RuleTypeState,
  AlertInstance as Alert,
} from '../../../../../alerting/server';
import { InfraBackendLibs } from '../../infra_types';
import {
  // buildRecoveredAlertReason,
  stateToAlertMessage,
  buildInvalidQueryAlertReason,
} from '../common/messages';
import { UNGROUPED_FACTORY_KEY } from '../common/utils';
import { AlertStates } from './types';
import { getActionsFromMetricThreshold } from './worker';

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

    const { groups, actionsToSchedule } = await getActionsFromMetricThreshold({
      params,
      config,
      prevGroups,
      alertOnNoData,
      alertOnGroupDisappear,
    });

    actionsToSchedule.forEach(
      ({ actionGroupId, alertState, group, reason, timestamp, value, threshold }) => {
        const alert = alertFactory(`${group}`, reason);
        alert.scheduleActions(actionGroupId, {
          group,
          alertState,
          reason,
          timestamp,
          value,
          threshold,
          metric: mapToConditionsLookup(criteria, (c) => c.metric),
        });
      }
    );

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

// TODO - deduplicate?
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
