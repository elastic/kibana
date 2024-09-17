/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit, orderBy } from 'lodash';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { AggregationsAutoDateHistogramAggregation } from '@elastic/elasticsearch/lib/api/types';
import { createElasticsearchClient } from '../../clients/elasticsearch';
import type { FunctionRegistrationParameters } from '..';
import {
  changesFunctionParameters,
  ChangesFunctionResponse,
} from '../../../common/functions/changes';
import { getMetricChanges } from './get_metric_changes';
import { getLogChanges } from './get_log_changes';

export const CHANGES_FUNCTION_NAME = 'changes';

export function registerChangesFunction({
  functions,
  resources: {
    logger,
    context: { core: corePromise },
  },
  pluginsStart,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: CHANGES_FUNCTION_NAME,
      description: 'Returns change points like spikes and dips for logs and metrics.',
      parameters: changesFunctionParameters,
    },
    async ({
      arguments: { start, end, logs = [], metrics = [] },
    }): Promise<ChangesFunctionResponse> => {
      if (logs.length === 0 && metrics.length === 0) {
        throw new Error('No metrics or logs were defined');
      }

      const core = await corePromise;

      const logSourcesService =
        await pluginsStart.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
          core.savedObjects.client
        );
      const logsIndexPattern = await logSourcesService.getFlattenedLogSources();

      const client = createElasticsearchClient({
        client: core.elasticsearch.client.asCurrentUser,
        logger,
        inspect: logger.isLevelEnabled('debug'),
      });

      const commonFilters = [
        {
          range: {
            '@timestamp': {
              gte: start,
              lt: end,
            },
          },
        },
      ];

      const dateHistogram: AggregationsAutoDateHistogramAggregation = {
        field: '@timestamp',
        buckets: 100,
      };

      const [metricChanges, logChanges] = await Promise.all([
        Promise.all([
          ...metrics.map(async (metric) => {
            const changes = await getMetricChanges({
              index: metric.index,
              client,
              filters: [
                ...commonFilters,
                ...(metric.kqlFilter
                  ? [toElasticsearchQuery(fromKueryExpression(metric.kqlFilter))]
                  : []),
              ],
              groupBy: metric.groupBy ?? [],
              type: metric.type || 'count',
              field: metric.field,
              dateHistogram,
            });

            return changes.map((change) => ({
              name: metric.name,
              ...change,
            }));
          }),
        ]),
        Promise.all([
          ...logs.map(async (log) => {
            const changes = await getLogChanges({
              index: log.index || logsIndexPattern,
              client,
              filters: [
                ...commonFilters,
                ...(log.kqlFilter
                  ? [toElasticsearchQuery(fromKueryExpression(log.kqlFilter))]
                  : []),
              ],
              field: log.field ?? 'message',
              dateHistogram,
            });
            return changes.map((change) => ({
              name: log.name,
              ...change,
            }));
          }),
        ]),
      ]);

      const allMetricChanges = orderBy(metricChanges.flat(), [
        (item) => ('p_value' in item.changes ? item.changes.p_value : Number.POSITIVE_INFINITY),
      ]).slice(0, 25);

      const allMetricChangesWithoutTimeseries = allMetricChanges.flat().map((metricChange) => {
        return omit(metricChange, 'over_time');
      });

      const allLogChanges = orderBy(logChanges.flat(), [
        (item) => ('p_value' in item.changes ? item.changes.p_value : Number.POSITIVE_INFINITY),
      ]).slice(0, 25);

      const allLogChangesWithoutTimeseries = allLogChanges.flat().map((logChange) => {
        return omit(logChange, 'over_time');
      });

      return {
        content: {
          description: `For each item, the user can see the type of change, the impact, the timestamp, the trend, and the label.
            Do not regurgitate these results back to the user.
            Instead, focus on the interesting changes, mention possible correlations or root causes, and suggest next steps to the user.
            "indeterminate" means that the system could not detect any changes.`,
          changes: {
            metrics: allMetricChangesWithoutTimeseries,
            logs: allLogChangesWithoutTimeseries,
          },
        },
        data: {
          changes: {
            metrics: allMetricChanges,
            logs: allLogChanges,
          },
        },
      };
    },
    ['observability']
  );
}
