/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertType, AlertExecutorOptions } from '../../types';
import { Params, ParamsSchema } from './alert_type_params';
import { BaseActionContext, addMessages } from './action_context';

export const ID = '.index-threshold';

import { Service } from '../../types';

const ActionGroupId = 'threshold met';
const CompareFns = getCompareFns();

export function getAlertType(service: Service): AlertType {
  const { logger } = service;

  // TODO: i18n
  const alertTypeName = 'Index Threshold';
  const actionGroupName = 'threshold met';

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

    const compareFn = CompareFns.get(params.comparator);
    if (compareFn == null) {
      throw new Error(`invalid comparator specified: "${params.comparator}"`);
    }

    const callCluster = services.callCluster;
    const date = new Date().toISOString();
    // the undefined values below are for config-schema optional types
    const queryParams = {
      index: params.index,
      timeField: params.timeField,
      aggType: params.aggType,
      aggField: params.aggField,
      groupField: params.groupField,
      groupLimit: params.groupLimit,
      dateStart: date,
      dateEnd: date,
      window: params.window,
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

type CompareFn = (value: number, threshold: number[]) => boolean;

function getCompareFns(): Map<string, CompareFn> {
  const fns: Record<string, CompareFn> = {
    lessThan: (value: number, threshold: number[]) => value < threshold[0],
    lessThanOrEqual: (value: number, threshold: number[]) => value <= threshold[0],
    greaterThanOrEqual: (value: number, threshold: number[]) => value >= threshold[0],
    greaterThan: (value: number, threshold: number[]) => value > threshold[0],
    between: (value: number, threshold: number[]) => value >= threshold[0] && value <= threshold[1],
    notBetween: (value: number, threshold: number[]) =>
      value < threshold[0] || value > threshold[1],
  };

  const result = new Map<string, CompareFn>();
  for (const key of Object.keys(fns)) {
    result.set(key, fns[key]);
  }

  return result;
}
