/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertType, AlertExecutorOptions } from '../../types';
import { Params, ParamsSchema } from './alert_type_params';
import { BaseActionContext, addMessages } from './action_context';
import { TimeSeriesQuery } from './lib/time_series_query';

export const ID = '.index-threshold';

import { Service } from '../../types';

const ActionGroupId = 'threshold met';
const ComparatorFns = getComparatorFns();
export const ComparatorFnNames = new Set(ComparatorFns.keys());

export function getAlertType(service: Service): AlertType {
  const { logger } = service;

  const alertTypeName = i18n.translate('xpack.alertingBuiltins.indexThreshold.alertTypeTitle', {
    defaultMessage: 'Index Threshold',
  });

  const actionGroupName = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.actionGroupThresholdMetTitle',
    {
      defaultMessage: 'Threshold Met',
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
    executor,
  };

  async function executor(options: AlertExecutorOptions) {
    const { alertId, name, services } = options;
    const params: Params = options.params as Params;

    const compareFn = ComparatorFns.get(params.thresholdComparator);
    if (compareFn == null) {
      throw new Error(getInvalidComparatorMessage(params.thresholdComparator));
    }

    const callCluster = services.callCluster;
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
    const result = await service.indexThreshold.timeSeriesQuery({
      logger,
      callCluster,
      query: queryParams,
    });
    logger.debug(`alert ${ID}:${alertId} "${name}" query result: ${JSON.stringify(result)}`);

    const groupResults = result.results || [];
    for (const groupResult of groupResults) {
      const instanceId = groupResult.group;
      const value = groupResult.metrics[0][1];
      const met = compareFn(value, params.threshold);

      if (!met) continue;

      const baseContext: BaseActionContext = {
        name,
        spaceId: options.spaceId,
        namespace: options.namespace,
        tags: options.tags,
        date,
        group: instanceId,
        value,
      };
      const actionContext = addMessages(baseContext, params);
      const alertInstance = options.services.alertInstanceFactory(instanceId);
      alertInstance.scheduleActions(ActionGroupId, actionContext);
      logger.debug(`scheduled actionGroup: ${JSON.stringify(actionContext)}`);
    }
  }
}

export function getInvalidComparatorMessage(comparator: string) {
  return i18n.translate('xpack.alertingBuiltins.indexThreshold.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}

type ComparatorFn = (value: number, threshold: number[]) => boolean;

function getComparatorFns(): Map<string, ComparatorFn> {
  const fns: Record<string, ComparatorFn> = {
    '<': (value: number, threshold: number[]) => value < threshold[0],
    '<=': (value: number, threshold: number[]) => value <= threshold[0],
    '>=': (value: number, threshold: number[]) => value >= threshold[0],
    '>': (value: number, threshold: number[]) => value > threshold[0],
    between: (value: number, threshold: number[]) => value >= threshold[0] && value <= threshold[1],
    notBetween: (value: number, threshold: number[]) =>
      value < threshold[0] || value > threshold[1],
  };

  const result = new Map<string, ComparatorFn>();
  for (const key of Object.keys(fns)) {
    result.set(key, fns[key]);
  }

  return result;
}
