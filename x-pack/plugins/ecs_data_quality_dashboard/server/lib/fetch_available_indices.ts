/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { CatIndicesIndicesRecord } from '@elastic/elasticsearch/lib/api/types';
import dateMath from '@kbn/datemath';

export type FetchAvailableCatIndicesResponseRequired = Array<
  Required<Pick<CatIndicesIndicesRecord, 'index' | 'creation.date'>>
>;

export interface FetchAvailableIndicesResponse {
  aggregations: {
    index: {
      buckets: Array<{
        key: string;
      }>;
    };
  };
}

export const fetchAvailableIndices = async (
  esClient: ElasticsearchClient,
  params: { indexPattern: string; startDate: string; endDate: string }
): Promise<FetchAvailableIndicesResponse> => {
  const { indexPattern, startDate, endDate } = params;

  const startDateMoment = dateMath.parse(startDate);
  const endDateMoment = dateMath.parse(endDate, { roundUp: true });

  if (
    !startDateMoment ||
    !endDateMoment ||
    !startDateMoment.isValid() ||
    !endDateMoment.isValid()
  ) {
    throw new Error('Invalid date format in startDate or endDate');
  }

  const startDateMillis = startDateMoment.valueOf();
  const endDateMillis = endDateMoment.valueOf();

  const indices = (await esClient.cat.indices({
    index: indexPattern,
    format: 'json',
    h: 'index,creation.date',
  })) as FetchAvailableCatIndicesResponseRequired;

  const filteredIndices = indices.filter((indexInfo) => {
    const creationDate: string = indexInfo['creation.date'] ?? '';
    const creationDateMillis = parseInt(creationDate, 10);

    if (isNaN(creationDateMillis)) {
      return false;
    }

    return creationDateMillis >= startDateMillis && creationDateMillis <= endDateMillis;
  });

  return {
    aggregations: {
      index: {
        buckets: filteredIndices.map((indexInfo) => ({
          key: indexInfo.index,
        })),
      },
    },
  };
};
