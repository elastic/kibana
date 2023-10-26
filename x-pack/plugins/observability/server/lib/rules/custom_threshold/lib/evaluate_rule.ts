/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  Aggregators,
  CustomMetricExpressionParams,
  MetricExpressionParams,
} from '../../../../../common/custom_threshold_rule/types';
import { AdditionalContext, getIntervalInSeconds } from '../utils';
import {
  AVERAGE_I18N,
  CARDINALITY_I18N,
  CUSTOM_EQUATION_I18N,
  DOCUMENT_COUNT_I18N,
  MAX_I18N,
  MIN_I18N,
  SUM_I18N,
} from '../translations';
import { SearchConfigurationType } from '../types';
import { createTimerange } from './create_timerange';
import { getData } from './get_data';
import { checkMissingGroups, MissingGroupsRecord } from './check_missing_group';
import { isCustom } from './metric_expression_params';

export interface EvaluatedRuleParams {
  criteria: MetricExpressionParams[];
  groupBy: string | undefined | string[];
  searchConfiguration: SearchConfigurationType;
}

export type Evaluation = Omit<MetricExpressionParams, 'metric'> & {
  metric: string;
  currentValue: number | null;
  timestamp: string;
  shouldFire: boolean;
  isNoData: boolean;
  bucketKey: Record<string, string>;
  context?: AdditionalContext;
};

const getMetric = (criterion: CustomMetricExpressionParams) => {
  if (!criterion.label && criterion.metrics.length === 1) {
    switch (criterion.metrics[0].aggType) {
      case Aggregators.COUNT:
        return DOCUMENT_COUNT_I18N;
      case Aggregators.AVERAGE:
        return AVERAGE_I18N(criterion.metrics[0].field!);
      case Aggregators.MAX:
        return MAX_I18N(criterion.metrics[0].field!);
      case Aggregators.MIN:
        return MIN_I18N(criterion.metrics[0].field!);
      case Aggregators.CARDINALITY:
        return CARDINALITY_I18N(criterion.metrics[0].field!);
      case Aggregators.SUM:
        return SUM_I18N(criterion.metrics[0].field!);
    }
  }
  return criterion.label || CUSTOM_EQUATION_I18N;
};

export const evaluateRule = async <Params extends EvaluatedRuleParams = EvaluatedRuleParams>(
  esClient: ElasticsearchClient,
  params: Params,
  dataView: string,
  timeFieldName: string,
  compositeSize: number,
  alertOnGroupDisappear: boolean,
  logger: Logger,
  timeframe: { start: string; end: string },
  lastPeriodEnd?: number,
  missingGroups: MissingGroupsRecord[] = []
): Promise<Array<Record<string, Evaluation>>> => {
  const { criteria, groupBy, searchConfiguration } = params;

  return Promise.all(
    criteria.map(async (criterion) => {
      const interval = `${criterion.timeSize}${criterion.timeUnit}`;
      const intervalAsSeconds = getIntervalInSeconds(interval);
      const intervalAsMS = intervalAsSeconds * 1000;
      const calculatedTimerange = createTimerange(
        intervalAsMS,
        criterion.aggType,
        timeframe,
        lastPeriodEnd
      );

      const currentValues = await getData(
        esClient,
        criterion,
        dataView,
        timeFieldName,
        groupBy,
        searchConfiguration.query.query,
        compositeSize,
        alertOnGroupDisappear,
        calculatedTimerange,
        logger,
        lastPeriodEnd
      );

      const verifiedMissingGroups = await checkMissingGroups(
        esClient,
        criterion,
        dataView,
        timeFieldName,
        groupBy,
        searchConfiguration.query.query,
        logger,
        calculatedTimerange,
        missingGroups
      );

      for (const missingGroup of verifiedMissingGroups) {
        if (currentValues[missingGroup.key] == null) {
          currentValues[missingGroup.key] = {
            value: null,
            trigger: false,
            bucketKey: missingGroup.bucketKey,
          };
        }
      }

      const evaluations: Record<string, Evaluation> = {};
      for (const key of Object.keys(currentValues)) {
        const result = currentValues[key];
        if (result.trigger || result.value === null) {
          evaluations[key] = {
            ...criterion,
            metric:
              criterion.aggType === 'count'
                ? DOCUMENT_COUNT_I18N
                : isCustom(criterion)
                ? getMetric(criterion)
                : criterion.metric,
            currentValue: result.value,
            timestamp: moment(calculatedTimerange.end).toISOString(),
            shouldFire: result.trigger,
            isNoData: result.value === null,
            bucketKey: result.bucketKey,
            context: {
              cloud: result.cloud,
              host: result.host,
              container: result.container,
              orchestrator: result.orchestrator,
              labels: result.labels,
              tags: result.tags,
            },
          };
        }
      }
      return evaluations;
    })
  );
};
