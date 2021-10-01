/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from 'src/core/server';
import { AlertType, AlertExecutorOptions, StackAlertsStartDeps } from '../../types';
import { Params, ParamsSchema } from './alert_type_params';
import { ActionContext, BaseActionContext, addMessages } from './action_context';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import {
  CoreQueryParamsSchemaProperties,
  TimeSeriesQuery,
} from '../../../../triggers_actions_ui/server';
import { ComparatorFns, getHumanReadableComparator } from '../lib';

export const ID = '.index-threshold';
export const ActionGroupId = 'threshold met';

export function getAlertType(
  logger: Logger,
  data: Promise<StackAlertsStartDeps['triggersActionsUi']['data']>
): AlertType<Params, never, {}, {}, ActionContext, typeof ActionGroupId> {
  const alertTypeName = i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeTitle', {
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

  const alertParamsVariables = Object.keys(CoreQueryParamsSchemaProperties).map(
    (propKey: string) => {
      return {
        name: propKey,
        description: propKey,
      };
    }
  );

  return {
    id: ID,
    name: alertTypeName,
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
        ...alertParamsVariables,
      ],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor,
    producer: STACK_ALERTS_FEATURE_ID,
  };

  async function executor(
    options: AlertExecutorOptions<Params, {}, {}, ActionContext, typeof ActionGroupId>
  ) {
    const { alertId, name, services, params } = options;

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

    const esClient = services.scopedClusterClient.asCurrentUser;
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
    };
    // console.log(`index_threshold: query: ${JSON.stringify(queryParams, null, 4)}`);
    const result = await (
      await data
    ).timeSeriesQuery({
      logger,
      esClient,
      query: queryParams,
    });
    logger.debug(`alert ${ID}:${alertId} "${name}" query result: ${JSON.stringify(result)}`);

    const groupResults = result.results || [];
    // console.log(`index_threshold: response: ${JSON.stringify(groupResults, null, 4)}`);
    for (const groupResult of groupResults) {
      const instanceId = groupResult.group;
      const metric =
        groupResult.metrics && groupResult.metrics.length > 0 ? groupResult.metrics[0] : null;
      const value = metric && metric.length === 2 ? metric[1] : null;

      if (value === null || value === undefined) {
        logger.debug(
          `alert ${ID}:${alertId} "${name}": no metrics found for group ${instanceId}} from groupResult ${JSON.stringify(
            groupResult
          )}`
        );
        continue;
      }

      const met = compareFn(value, params.threshold);

      if (!met) continue;

      const agg = params.aggField ? `${params.aggType}(${params.aggField})` : `${params.aggType}`;
      const humanFn = `${agg} is ${getHumanReadableComparator(
        params.thresholdComparator
      )} ${params.threshold.join(' and ')}`;

      const baseContext: BaseActionContext = {
        date,
        group: instanceId,
        value,
        conditions: humanFn,
      };
      const actionContext = addMessages(options, baseContext, params);
      const alertInstance = options.services.alertInstanceFactory(instanceId);
      alertInstance.scheduleActions(ActionGroupId, actionContext);
      logger.debug(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
    }
  }
}
