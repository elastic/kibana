/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import { AlertType, AlertExecutorOptions, StackAlertsStartDeps } from '../../types';
import { ActionContext, BaseActionContext, addMessages } from './action_context';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { TimeSeriesQuery } from '../../../../triggers_actions_ui/server';
import { ComparatorFns, ComparatorFnNames, getInvalidComparatorMessage } from '../lib';
import { AlertTypeParams } from '../../../../alerts/server';
import { validateTimeWindowUnits } from '../../../../triggers_actions_ui/server';

export const ES_QUERY_ID = '.es-query';

const ActionGroupId = 'doc count threshold met';

export const ParamsSchema = schema.object({
  indices: schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
  timeField: schema.string({ minLength: 1 }),
  esQuery: schema.string({ minLength: 1 }),
  timeWindowSize: schema.number({ min: 1 }),
  timeWindowUnit: schema.string({ validate: validateTimeWindowUnits }),
  threshold: schema.arrayOf(schema.number(), { minSize: 1, maxSize: 2 }),
  thresholdComparator: schema.string({ validate: validateComparator }),
});

export type EsQueryAlertParams = TypeOf<typeof ParamsSchema>;

export function getAlertType(
  logger: Logger,
  data: Promise<StackAlertsStartDeps['triggersActionsUi']['data']>
): AlertType<EsQueryAlertParams, {}, {}, ActionContext, typeof ActionGroupId> {
  const alertTypeName = i18n.translate('xpack.stackAlerts.esQuery.alertTypeTitle', {
    defaultMessage: 'ES query',
  });

  const actionGroupName = i18n.translate('xpack.stackAlerts.esQuery.actionGroupThresholdMetTitle', {
    defaultMessage: 'Doc Count Threshold Met',
  });

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date the alert matched the threshold condition.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that matched the threshold condition.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A pre-constructed message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A pre-constructed title for the alert.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string describing the threshold condition.',
    }
  );

  return {
    id: ES_QUERY_ID,
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
        { name: 'date', description: actionVariableContextDateLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'conditions', description: actionVariableContextConditionsLabel },
      ],
    },
    minimumLicenseRequired: 'basic',
    executor,
    producer: STACK_ALERTS_FEATURE_ID,
  };

  async function executor(
    options: AlertExecutorOptions<EsQueryAlertParams, {}, {}, ActionContext, typeof ActionGroupId>
  ) {
    const { alertId, name, services, params } = options;

    const compareFn = ComparatorFns.get(params.thresholdComparator);
    if (compareFn == null) {
      throw new Error(getInvalidComparatorError(params.thresholdComparator));
    }

    const callCluster = services.callCluster;
    const date = new Date().toISOString();
    // the undefined values below are for config-schema optional types
    //   const queryParams: TimeSeriesQuery = {
    //     index: params.indices,
    //     timeField: params.timeField,
    //     esQuery: params.esQuery,
    //     dateStart: date,
    //     dateEnd: date,
    //     timeWindowSize: params.timeWindowSize,
    //     timeWindowUnit: params.timeWindowUnit,
    //     interval: undefined,
    //   };
    //   // console.log(`index_threshold: query: ${JSON.stringify(queryParams, null, 4)}`);
    //   const result = await (await data).timeSeriesQuery({
    //     logger,
    //     callCluster,
    //     query: queryParams,
    //   });
    //   logger.debug(
    //     `alert ${ES_QUERY_ID}:${alertId} "${name}" query result: ${JSON.stringify(result)}`
    //   );

    //   const groupResults = result.results || [];
    //   // console.log(`index_threshold: response: ${JSON.stringify(groupResults, null, 4)}`);
    //   for (const groupResult of groupResults) {
    //     const instanceId = groupResult.group;
    //     const value = groupResult.metrics[0][1];
    //     const met = compareFn(value, params.threshold);

    //     if (!met) continue;

    //     const agg = params.aggField ? `${params.aggType}(${params.aggField})` : `${params.aggType}`;
    //     const humanFn = `${agg} is ${getHumanReadableComparator(
    //       params.thresholdComparator
    //     )} ${params.threshold.join(' and ')}`;

    //     const baseContext: BaseActionContext = {
    //       date,
    //       group: instanceId,
    //       value,
    //       conditions: humanFn,
    //     };
    //     const actionContext = addMessages(options, baseContext, params);
    //     const alertInstance = options.services.alertInstanceFactory(instanceId);
    //     alertInstance.scheduleActions(ActionGroupId, actionContext);
    //     logger.debug(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
    //   }
  }
}

function getInvalidComparatorError(comparator: string) {
  return getInvalidComparatorMessage(
    'xpack.stackAlerts.indexThreshold.invalidComparatorErrorMessage',
    comparator
  );
}
function validateComparator(comparator: string): string | undefined {
  if (ComparatorFnNames.has(comparator)) return;

  return getInvalidComparatorError(comparator);
}
