/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { isString, get, identity } from 'lodash';
import type { BucketKey } from './get_data';
import { calculateCurrentTimeframe, createBaseFilters } from './metric_query';
import { MetricExpressionParams } from '../../../../../common/alerting/metrics';

export interface MissingGroupsRecord {
  key: string;
  bucketKey: BucketKey;
}

export const checkMissingGroups = async (
  esClient: ElasticsearchClient,
  metricParams: MetricExpressionParams,
  indexPattern: string,
  timeFieldName: string,
  groupBy: string | undefined | string[],
  filterQuery: string | undefined,
  logger: Logger,
  timeframe: { start: number; end: number },
  missingGroups: MissingGroupsRecord[] = []
): Promise<MissingGroupsRecord[]> => {
  if (missingGroups.length === 0) {
    return missingGroups;
  }
  const currentTimeframe = calculateCurrentTimeframe(metricParams, timeframe);
  const baseFilters = createBaseFilters(metricParams, currentTimeframe, timeFieldName, filterQuery);
  const groupByFields = isString(groupBy) ? [groupBy] : groupBy ? groupBy : [];

  const searches = missingGroups.flatMap((group) => {
    const groupByFilters = Object.values(group.bucketKey).map((key, index) => {
      return {
        match: {
          [groupByFields[index]]: key,
        },
      };
    });
    return [
      { index: indexPattern },
      {
        size: 0,
        terminate_after: 1,
        track_total_hits: true,
        query: {
          bool: {
            filter: [...baseFilters, ...groupByFilters],
          },
        },
      },
    ];
  });

  logger.trace(`Request: ${JSON.stringify({ searches })}`);
  const response = await esClient.msearch({ searches });
  logger.trace(`Response: ${JSON.stringify(response)}`);

  const verifiedMissingGroups = response.responses
    .map((resp, index) => {
      const total = get(resp, 'hits.total.value', 0) as number;
      if (!total) {
        return missingGroups[index];
      }
      return null;
    })
    .filter(identity) as MissingGroupsRecord[];

  return verifiedMissingGroups;
};
