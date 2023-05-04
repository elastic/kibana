/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  CoreQueryParamsSchemaProperties,
  TimeSeriesQuery,
  TIME_SERIES_BUCKET_SELECTOR_FIELD,
} from '@kbn/triggers-actions-ui-plugin/server';
import { isGroupAggregation } from '@kbn/triggers-actions-ui-plugin/common';
import { RuleType, RuleExecutorOptions, StackAlertsStartDeps } from '../../types';
import { Params, ParamsSchema } from './rule_type_params';
import { ActionContext, BaseActionContext, addMessages } from './action_context';
import {
  ComparatorFns,
  getComparatorScript,
  getHumanReadableComparator,
  STACK_ALERTS_FEATURE_ID,
} from '../../../common';

export const ID = '.index-threshold';
export const ActionGroupId = 'threshold met';

export function getRuleType(
  data: Promise<StackAlertsStartDeps['triggersActionsUi']['data']>
): RuleType<Params, never, {}, {}, ActionContext, typeof ActionGroupId> {
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
      defaultMessage: 'The date the alert exceeded the threshold.',
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
        "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
    }
  );

  const actionVariableContextThresholdComparatorLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextThresholdComparatorLabel',
    {
      defaultMessage: 'A comparison function to use to determine if the threshold as been met.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.indexThreshold.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string describing the threshold comparator and threshold',
    }
  );

  const ruleParamsVariables = Object.keys(CoreQueryParamsSchemaProperties).map(
    (propKey: string) => {
      return {
        name: propKey,
        description: propKey,
      };
    }
  );

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
        ...ruleParamsVariables,
      ],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor,
    producer: STACK_ALERTS_FEATURE_ID,
    doesSetRecoveryContext: true,
  };

  async function executor(
    options: RuleExecutorOptions<Params, {}, {}, ActionContext, typeof ActionGroupId>
  ) {
    const {
      rule: { id: ruleId, name },
      services,
      params,
      logger,
    } = options;
    const { alertFactory, scopedClusterClient } = services;

    const alertLimit = alertFactory.alertLimit.getValue();

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
      const alert = alertFactory.create(alertId);
      alert.scheduleActions(ActionGroupId, actionContext);
      logger.debug(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
    }

    alertFactory.alertLimit.setLimitReached(result.truncated);

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
      recoveredAlert.setContext(recoveryContext);
    }

    return { state: {} };
  }
}
