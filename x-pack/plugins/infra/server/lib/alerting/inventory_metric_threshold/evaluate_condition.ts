/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { mapValues } from 'lodash';
import moment from 'moment';
import { Logger } from '@kbn/logging';
import { InventoryMetricConditions } from '../../../../common/alerting/metrics';
import { InfraTimerangeInput } from '../../../../common/http_api';
import { InventoryItemType } from '../../../../common/inventory_models/types';
import { LogQueryFields } from '../../../services/log_queries/get_log_query_fields';
import { InfraSource } from '../../sources';
import { calcualteFromBasedOnMetric } from './lib/calculate_from_based_on_metric';
import { getData } from './lib/get_data';

type ConditionResult = InventoryMetricConditions & {
  shouldFire: boolean;
  shouldWarn: boolean;
  currentValue: number;
  isNoData: boolean;
  isError: boolean;
};

export const evaluateCondition = async ({
  condition,
  nodeType,
  source,
  logQueryFields,
  esClient,
  compositeSize,
  filterQuery,
  lookbackSize,
  startTime,
  logger,
}: {
  condition: InventoryMetricConditions;
  nodeType: InventoryItemType;
  source: InfraSource;
  logQueryFields: LogQueryFields | undefined;
  esClient: ElasticsearchClient;
  compositeSize: number;
  filterQuery?: string;
  lookbackSize?: number;
  startTime?: number;
  logger: Logger;
}): Promise<Record<string, ConditionResult>> => {
  const { metric, customMetric } = condition;

  const to = startTime ? moment(startTime) : moment();

  const timerange = {
    to: to.valueOf(),
    from: calcualteFromBasedOnMetric(to, condition, nodeType, metric, customMetric),
    interval: `${condition.timeSize}${condition.timeUnit}`,
    forceInterval: true,
  } as InfraTimerangeInput;

  if (lookbackSize) {
    timerange.lookbackSize = lookbackSize;
  }

  const currentValues = await getData(
    esClient,
    nodeType,
    metric,
    timerange,
    source,
    logQueryFields,
    compositeSize,
    condition,
    logger,
    filterQuery,
    customMetric
  );

  const result = mapValues(currentValues, (value) => {
    return {
      ...condition,
      shouldFire: value.trigger,
      shouldWarn: value.warn,
      isNoData: value === null,
      isError: value === undefined,
      currentValue: value.value,
    };
  }) as unknown; // Typescript doesn't seem to know what `throw` is doing

  return result as Record<string, ConditionResult>;
};
