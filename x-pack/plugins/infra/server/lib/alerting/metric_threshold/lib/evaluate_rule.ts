/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { Aggregators, MetricExpressionParams } from '../../../../../common/alerting/metrics';
import { InfraSource } from '../../../../../common/source_configuration/source_configuration';
import { getIntervalInSeconds } from '../../../../utils/get_interval_in_seconds';
import { DOCUMENT_COUNT_I18N } from '../../common/messages';
import { UNGROUPED_FACTORY_KEY } from '../../common/utils';
import { createTimerange } from './create_timerange';
import { getData, GetDataResponse } from './get_data';

export interface EvaluatedRuleParams {
  criteria: MetricExpressionParams[];
  groupBy: string | undefined | string[];
  filterQuery?: string;
  filterQueryText?: string;
}

export type Evaluation = Omit<MetricExpressionParams, 'metric'> & {
  metric: string;
  currentValue: number | null;
  timestamp: string;
  shouldFire: boolean;
  shouldWarn: boolean;
  isNoData: boolean;
};

export const evaluateRule = async <Params extends EvaluatedRuleParams = EvaluatedRuleParams>(
  esClient: ElasticsearchClient,
  params: Params,
  config: InfraSource['configuration'],
  prevGroups: string[],
  compositeSize: number,
  alertOnGroupDisappear: boolean,
  timeframe?: { start?: number; end: number }
): Promise<Array<Record<string, Evaluation>>> => {
  const { criteria, groupBy, filterQuery } = params;

  return Promise.all(
    criteria.map(async (criterion) => {
      const interval = `${criterion.timeSize}${criterion.timeUnit}`;
      const intervalAsSeconds = getIntervalInSeconds(interval);
      const intervalAsMS = intervalAsSeconds * 1000;
      const calculatedTimerange = createTimerange(intervalAsMS, criterion.aggType, timeframe);

      const currentValues = await getData(
        esClient,
        criterion,
        config.metricAlias,
        groupBy,
        filterQuery,
        compositeSize,
        alertOnGroupDisappear,
        calculatedTimerange
      );

      const backfilledPrevGroups: GetDataResponse = {};
      if (alertOnGroupDisappear) {
        const currentGroups = Object.keys(currentValues);
        const missingGroups = difference(prevGroups, currentGroups);

        if (currentGroups.length === 0 && missingGroups.length === 0) {
          missingGroups.push(UNGROUPED_FACTORY_KEY);
        }
        for (const group of missingGroups) {
          backfilledPrevGroups[group] = {
            // The value use to be set to ZERO for missing groups when using
            // Aggregators.COUNT. But that would only trigger if conditions
            // matched.
            value: null,
            trigger: false,
            warn: false,
          };
        }
      }

      const currentValuesWithBackfilledPrevGroups = {
        ...currentValues,
        ...backfilledPrevGroups,
      };

      const evaluations: Record<string, Evaluation> = {};
      for (const key of Object.keys(currentValuesWithBackfilledPrevGroups)) {
        const result = currentValuesWithBackfilledPrevGroups[key];
        evaluations[key] = {
          ...criterion,
          metric: criterion.metric ?? DOCUMENT_COUNT_I18N,
          currentValue: result.value,
          timestamp: moment(calculatedTimerange.start).toISOString(),
          shouldFire: result.trigger,
          shouldWarn: result.warn,
          isNoData: result.value === null,
        };
      }
      return evaluations;
    })
  );
};
