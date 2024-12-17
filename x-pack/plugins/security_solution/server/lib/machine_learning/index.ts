/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { MlAnomalyRecordDoc as Anomaly } from '@kbn/ml-anomaly-utils';
import type { Filter } from '@kbn/es-query';

export type { Anomaly };
export type AnomalyResults = estypes.SearchResponse<Anomaly>;
type MlAnomalySearch = <T>(
  searchParams: estypes.SearchRequest,
  jobIds: string[]
) => Promise<estypes.SearchResponse<T>>;

export interface AnomaliesSearchParams {
  jobIds: string[];
  threshold: number;
  earliestMs: number;
  latestMs: number;
  maxRecords?: number;
  exceptionFilter: Filter | undefined;
}

export const getAnomalies = async (
  params: AnomaliesSearchParams,
  mlAnomalySearch: MlAnomalySearch
): Promise<AnomalyResults> => {
  const queryRequest = buildAnomalyQuery(params);
  return mlAnomalySearch(queryRequest, params.jobIds);
};

export const buildAnomalyQuery = (params: AnomaliesSearchParams): estypes.SearchRequest => {
  const boolCriteria = buildCriteria(params);
  return {
    body: {
      size: params.maxRecords || 100,
      query: {
        bool: {
          filter: [
            {
              query_string: {
                query: 'result_type:record',
                analyze_wildcard: false,
              },
            },
            { term: { is_interim: false } },
            {
              bool: {
                must: boolCriteria,
              },
            },
          ],
          must_not: params.exceptionFilter?.query,
        },
      },
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
      ],
      sort: [{ record_score: { order: 'desc' as const } }],
    },
  };
};

const buildCriteria = (params: AnomaliesSearchParams): object[] => {
  const { earliestMs, jobIds, latestMs, threshold } = params;
  const jobIdsFilterable = jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*');

  const boolCriteria: object[] = [
    {
      range: {
        timestamp: {
          gte: earliestMs,
          lte: latestMs,
          format: 'epoch_millis',
        },
      },
    },
    {
      range: {
        record_score: {
          gte: threshold,
        },
      },
    },
  ];

  if (jobIdsFilterable) {
    const jobIdFilter = jobIds.map((jobId) => `job_id:${jobId}`).join(' OR ');

    boolCriteria.push({
      query_string: {
        analyze_wildcard: false,
        query: jobIdFilter,
      },
    });
  }

  return boolCriteria;
};
