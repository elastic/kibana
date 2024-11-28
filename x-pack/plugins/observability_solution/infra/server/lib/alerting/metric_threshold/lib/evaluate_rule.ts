/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import moment from 'moment';
import type { Logger } from '@kbn/logging';
import { isCustom } from './metric_expression_params';
import { MetricExpressionParams } from '../../../../../common/alerting/metrics';
import { getIntervalInSeconds } from '../../../../../common/utils/get_interval_in_seconds';
import { CUSTOM_EQUATION_I18N, DOCUMENT_COUNT_I18N } from '../../common/messages';
import { createTimerange } from './create_timerange';
import { getData } from './get_data';
import { checkMissingGroups, MissingGroupsRecord } from './check_missing_group';
import { AdditionalContext } from '../../common/utils';

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
  bucketKey: Record<string, string>;
  context?: AdditionalContext;
};

export const evaluateRule = async <Params extends EvaluatedRuleParams = EvaluatedRuleParams>(
  esClient: ElasticsearchClient,
  params: Params,
  dataView: string,
  timeFieldName: string,
  compositeSize: number,
  alertOnGroupDisappear: boolean,
  logger: Logger,
  lastPeriodEnd?: number,
  timeframe?: { start?: number; end: number },
  missingGroups: MissingGroupsRecord[] = []
): Promise<Array<Record<string, Evaluation>>> => {
  const { criteria, groupBy, filterQuery } = params;

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
        filterQuery,
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
        filterQuery,
        logger,
        calculatedTimerange,
        missingGroups
      );

      for (const missingGroup of verifiedMissingGroups) {
        if (currentValues[missingGroup.key] == null) {
          currentValues[missingGroup.key] = {
            value: null,
            trigger: false,
            warn: false,
            bucketKey: missingGroup.bucketKey,
          };
        }
      }

      const evaluations: Record<string, Evaluation> = {};
      for (const key of Object.keys(currentValues)) {
        const result = currentValues[key];
        if (result.trigger || result.warn || result.value === null) {
          evaluations[key] = {
            ...criterion,
            metric:
              criterion.aggType === 'count'
                ? DOCUMENT_COUNT_I18N
                : isCustom(criterion) && criterion.label
                ? criterion.label
                : criterion.aggType === 'custom'
                ? CUSTOM_EQUATION_I18N
                : criterion.metric,
            currentValue: result.value,
            timestamp: moment(calculatedTimerange.end).toISOString(),
            shouldFire: result.trigger,
            shouldWarn: result.warn,
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
