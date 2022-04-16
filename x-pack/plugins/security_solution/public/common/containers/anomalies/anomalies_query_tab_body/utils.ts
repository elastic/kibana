/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepmerge from 'deepmerge';

import { MlSummaryJob } from '@kbn/ml-plugin/public';
import { FlowTarget } from '../../../../../common/search_strategy';
import { ESTermQuery } from '../../../../../common/typed_json';
import { createFilter } from '../../helpers';

export const getAnomaliesFilterQuery = (
  filterQuery: string | ESTermQuery | undefined,
  anomaliesFilterQuery: object = {},
  securityJobs: MlSummaryJob[] = [],
  anomalyScore: number,
  flowTarget?: FlowTarget,
  ip?: string
): string => {
  const securityJobIds = securityJobs
    .map((job) => job.id)
    .map((jobId) => ({
      match_phrase: {
        job_id: jobId,
      },
    }));

  const filterQueryString = createFilter(filterQuery);
  const filterQueryObject = filterQueryString ? JSON.parse(filterQueryString) : {};
  const mergedFilterQuery = deepmerge.all([
    filterQueryObject,
    anomaliesFilterQuery,
    {
      bool: {
        filter: [
          {
            bool: {
              should: securityJobIds,
              minimum_should_match: 1,
            },
          },
          {
            match_phrase: {
              result_type: 'record',
            },
          },
          flowTarget &&
            ip && {
              match_phrase: {
                [`${flowTarget}.ip`]: ip,
              },
            },
          {
            range: {
              record_score: {
                gte: anomalyScore,
              },
            },
          },
        ],
      },
    },
  ]);

  return JSON.stringify(mergedFilterQuery);
};
