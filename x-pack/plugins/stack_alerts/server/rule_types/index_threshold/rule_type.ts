/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  TimeSeriesQuery,
  TIME_SERIES_BUCKET_SELECTOR_FIELD,
} from '@kbn/triggers-actions-ui-plugin/server';
import { isGroupAggregation } from '@kbn/triggers-actions-ui-plugin/common';
import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import { StackAlert } from '@kbn/alerts-as-data-utils';
import { ALERT_EVALUATION_VALUE, ALERT_REASON } from '@kbn/rule-data-utils';
import { expandFlattenedAlert } from '@kbn/alerting-plugin/server/alerts_client/lib';
import { STACK_AAD_INDEX_NAME } from '..';
import { ALERT_EVALUATION_CONDITIONS, ALERT_TITLE } from '../es_query/fields';
import {
  ComparatorFns,
  getComparatorScript,
  getHumanReadableComparator,
  STACK_ALERTS_FEATURE_ID,
} from '../../../common';
import { ActionContext, BaseActionContext, addMessages } from './action_context';
import { Params, ParamsSchema } from './rule_type_params';
import { RuleType, RuleExecutorOptions, StackAlertsStartDeps } from '../../types';

export const ID = '.index-threshold';
export const ActionGroupId = 'threshold met';

export function getRuleType(
  data: Promise<StackAlertsStartDeps['triggersActionsUi']['data']>
): RuleType<Params, never, {}, {}, ActionContext, typeof ActionGroupId, never, StackAlert> {
  const ruleTypeName = i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeTitle', {
    defaultMessage: 'Index threshold',
  });

  const actionGroupName = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionGroupThresholdMetTitle',
    {
      defaultMessage: 'Threshold met',
    }
  );

  const actionVariableContextGroupLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextGroupLabel',
    {
      defaultMessage: 'The group that exceeded the threshold.',
    }
  );

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date the alert met the threshold conditions.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that exceeded the threshold.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A pre-constructed message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A pre-constructed title for the alert.',
    }
  );

  const actionVariableContextThresholdLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextThresholdLabel',
    {
      defaultMessage:
        'An array of rule threshold values. For between and notBetween thresholds, there are two values.',
    }
  );

  const actionVariableContextThresholdComparatorLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextThresholdComparatorLabel',
    {
      defaultMessage: 'The comparison function for the threshold.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string describing the threshold comparator and threshold.',
    }
  );

  const actionVariableContextIndexLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextIndexLabel',
    {
      defaultMessage: 'The indices the rule queries.',
    }
  );

  const actionVariableContextTimeFieldLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextTimeFieldLabel',
    {
      defaultMessage: 'The field that is used to calculate the time window.',
    }
  );

  const actionVariableContextAggTypeLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextAggTypeLabel',
    {
      defaultMessage: 'The type of aggregation.',
    }
  );

  const actionVariableContextAggFieldLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextAggFieldLabel',
    {
      defaultMessage: 'The field that is used in the aggregation.',
    }
  );

  const actionVariableContextGroupByLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextGroupByLabel',
    {
      defaultMessage:
        'Indicates whether the aggregation is applied over all documents or split into groups.',
    }
  );

  const actionVariableContextTermFieldLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextTermFieldLabel',
    {
      defaultMessage: 'The field that is used for grouping the aggregation.',
    }
  );

  const actionVariableContextFilterKueryLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextFilterKueryLabel',
    {
      defaultMessage: 'A KQL expression that limits the scope of alerts.',
    }
  );

  const actionVariableContextTermSizeLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextTermSizeLabel',
    {
      defaultMessage: 'The number of groups that are checked against the threshold.',
    }
  );

  const actionVariableContextTimeWindowSizeLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextTimeWindowSizeLabel',
    {
      defaultMessage:
        'The size of the time window, which determines how far back to search for documents.',
    }
  );

  const actionVariableContextTimeWindowUnitLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextTimeWindowUnitLabel',
    {
      defaultMessage: 'The type of units for the time window: seconds, minutes, hours, or days.',
    }
  );

  const alerts: IRuleTypeAlerts<StackAlert> = {
    context: STACK_AAD_INDEX_NAME,
    mappings: {
      fieldMap: {
        [ALERT_TITLE]: { type: 'keyword', array: false, required: false },
        [ALERT_EVALUATION_CONDITIONS]: { type: 'keyword', array: false, required: false },
        [ALERT_EVALUATION_VALUE]: { type: 'keyword', array: false, required: false },
      },
    },
    shouldWrite: true,
  };

  return {
    id: ID,
    name: ruleTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: ParamsSchema,
    },
    actionVariables: {
      context: [
        { name: 'message', description: actionVariableContextMessageLabel },
        { name: 'title', description: actionVariableContextTitleLabel },
        { name: 'group', description: actionVariableContextGroupLabel },
        { name: 'date', description: actionVariableContextDateLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'conditions', description: actionVariableContextConditionsLabel },
      ],
      params: [
        { name: 'threshold', description: actionVariableContextThresholdLabel },
        { name: 'thresholdComparator', description: actionVariableContextThresholdComparatorLabel },
        { name: 'index', description: actionVariableContextIndexLabel },
        { name: 'timeField', description: actionVariableContextTimeFieldLabel },
        { name: 'aggType', description: actionVariableContextAggTypeLabel },
        { name: 'aggField', description: actionVariableContextAggFieldLabel },
        { name: 'groupBy', description: actionVariableContextGroupByLabel },
        { name: 'termField', description: actionVariableContextTermFieldLabel },
        { name: 'filterKuery', description: actionVariableContextFilterKueryLabel },
        { name: 'termSize', description: actionVariableContextTermSizeLabel },
        { name: 'timeWindowSize', description: actionVariableContextTimeWindowSizeLabel },
        { name: 'timeWindowUnit', description: actionVariableContextTimeWindowUnitLabel },
      ],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor,
    producer: STACK_ALERTS_FEATURE_ID,
    doesSetRecoveryContext: true,
    alerts,
  };

  async function executor(
    options: RuleExecutorOptions<Params, {}, {}, ActionContext, typeof ActionGroupId, StackAlert>
  ) {
    const {
      rule: { id: ruleId, name },
      services,
      params,
      logger,
    } = options;
    const { alertsClient, scopedClusterClient } = services;

    const alertLimit = alertsClient!.getAlertLimitValue();

    const compareFn = ComparatorFns.get(params.thresholdComparator);
    if (compareFn == null) {
      throw new Error(
        i18n.translate('xpack.stackAlerts.indexThreshold.invalidComparatorErrorMessage', {
          defaultMessage: 'invalid thresholdComparator specified: {comparator}',
          values: {
            comparator: params.thresholdComparator,
          },
        })
      );
    }

    const esClient = scopedClusterClient.asCurrentUser;
    const date = new Date().toISOString();
    // the undefined values below are for config-schema optional types
    const queryParams: TimeSeriesQuery = {
      index: params.index,
      timeField: params.timeField,
      aggType: params.aggType,
      aggField: params.aggField,
      groupBy: params.groupBy,
      termField: params.termField,
      termSize: params.termSize,
      dateStart: date,
      dateEnd: date,
      timeWindowSize: params.timeWindowSize,
      timeWindowUnit: params.timeWindowUnit,
      interval: undefined,
      filterKuery: params.filterKuery,
    };
    // console.log(`index_threshold: query: ${JSON.stringify(queryParams, null, 4)}`);
    const result = await (
      await data
    ).timeSeriesQuery({
      logger,
      esClient,
      query: queryParams,
      condition: {
        resultLimit: alertLimit,
        conditionScript: getComparatorScript(
          params.thresholdComparator,
          params.threshold,
          TIME_SERIES_BUCKET_SELECTOR_FIELD
        ),
      },
    });
    logger.debug(`rule ${ID}:${ruleId} "${name}" query result: ${JSON.stringify(result)}`);

    const isGroupAgg = isGroupAggregation(queryParams.termField);

    const unmetGroupValues: Record<string, number> = {};
    const agg = params.aggField ? `${params.aggType}(${params.aggField})` : `${params.aggType}`;

    const groupResults = result.results || [];
    // console.log(`index_threshold: response: ${JSON.stringify(groupResults, null, 4)}`);
    for (const groupResult of groupResults) {
      const alertId = groupResult.group;
      const metric =
        groupResult.metrics && groupResult.metrics.length > 0 ? groupResult.metrics[0] : null;
      const value = metric && metric.length === 2 ? metric[1] : null;

      if (value === null || value === undefined) {
        logger.debug(
          `rule ${ID}:${ruleId} "${name}": no metrics found for group ${alertId}} from groupResult ${JSON.stringify(
            groupResult
          )}`
        );
        continue;
      }

      // group aggregations use the bucket selector agg to compare conditions
      // within the ES query, so only 'met' results are returned, therefore we don't need
      // to use the compareFn
      const met = isGroupAgg ? true : compareFn(value, params.threshold);

      if (!met) {
        unmetGroupValues[alertId] = value;
        continue;
      }

      const humanFn = `${agg} is ${getHumanReadableComparator(
        params.thresholdComparator
      )} ${params.threshold.join(' and ')}`;

      const baseContext: BaseActionContext = {
        date,
        group: alertId,
        value,
        conditions: humanFn,
      };
      const actionContext = addMessages(name, baseContext, params);
      // const alert = alertFactory.create(alertId);
      // alert.scheduleActions(ActionGroupId, actionContext);
      alertsClient!.report({
        id: alertId,
        actionGroup: ActionGroupId,
        state: {},
        context: actionContext,
        payload: expandFlattenedAlert({
          [ALERT_REASON]: actionContext.message,
          [ALERT_TITLE]: actionContext.title,
          [ALERT_EVALUATION_CONDITIONS]: actionContext.conditions,
          [ALERT_EVALUATION_VALUE]: actionContext.value,
        }),
      });
      logger.debug(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
    }

    alertsClient!.setAlertLimitReached(result.truncated);

    const { getRecoveredAlerts } = services.alertFactory.done();
    for (const recoveredAlert of getRecoveredAlerts()) {
      const alertId = recoveredAlert.getId();
      logger.debug(`setting context for recovered alert ${alertId}`);
      const baseContext: BaseActionContext = {
        date,
        value: unmetGroupValues[alertId] ?? 'unknown',
        group: alertId,
        conditions: `${agg} is NOT ${getHumanReadableComparator(
          params.thresholdComparator
        )} ${params.threshold.join(' and ')}`,
      };
      const recoveryContext = addMessages(name, baseContext, params, true);
      alertsClient?.setAlertData({
        id: alertId,
        context: recoveryContext,
        payload: expandFlattenedAlert({
          [ALERT_REASON]: recoveryContext.message,
          [ALERT_TITLE]: recoveryContext.title,
          [ALERT_EVALUATION_CONDITIONS]: recoveryContext.conditions,
          [ALERT_EVALUATION_VALUE]: recoveryContext.value,
        }),
      });
    }

    return { state: {} };
  }
}
