/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { intersection } from 'lodash';
import { leftJoin } from '../../../common/utils/left_join';
import { rangeFilter } from '../helpers/range_filter';
import { Job as AnomalyDetectionJob } from '../../../../ml/server';
import { PromiseReturnType } from '../../../typings/common';
import { IEnvOptions } from './get_service_map';
import { APM_ML_JOB_GROUP_NAME } from '../../../common/ml_job_constants';

type ApmMlJobCategory = NonNullable<ReturnType<typeof getApmMlJobCategory>>;
const getApmMlJobCategory = (
  mlJob: AnomalyDetectionJob,
  serviceNames: string[]
) => {
  const apmJobGroups = mlJob.groups.filter(
    (groupName) => groupName !== APM_ML_JOB_GROUP_NAME
  );
  if (apmJobGroups.length === mlJob.groups.length) {
    // ML job missing "apm" group name
    return;
  }
  const [serviceName] = intersection(apmJobGroups, serviceNames);
  if (!serviceName) {
    // APM ML job service was not found
    return;
  }
  const [transactionType] = apmJobGroups.filter(
    (groupName) => groupName !== serviceName
  );
  if (!transactionType) {
    // APM ML job transaction type was not found.
    return;
  }
  return { jobId: mlJob.job_id, serviceName, transactionType };
};

export type ServiceAnomalies = PromiseReturnType<typeof getServiceAnomalies>;

export async function getServiceAnomalies(
  options: IEnvOptions,
  serviceNames: string[]
) {
  const { start, end, ml } = options.setup;

  if (!ml || serviceNames.length === 0) {
    return [];
  }

  const { jobs: apmMlJobs } = await ml.anomalyDetectors.jobs('apm');
  const apmMlJobCategories = apmMlJobs
    .map((job) => getApmMlJobCategory(job, serviceNames))
    .filter(
      (apmJobCategory) => apmJobCategory !== undefined
    ) as ApmMlJobCategory[];
  const apmJobIds = apmMlJobs.map((job) => job.job_id);
  const rangeQuery = { range: rangeFilter(start, end, 'timestamp') };
  const params = {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { result_type: 'bucket' } },
            {
              terms: {
                job_id: apmJobIds,
              },
            },
            rangeQuery,
          ],
        },
      },
      aggs: {
        jobs: {
          terms: { field: 'job_id', size: apmJobIds.length },
          aggs: {
            top_score_hits: {
              top_hits: {
                sort: [{ anomaly_score: { order: 'desc' as const } }],
                _source: ['anomaly_score', 'timestamp'],
                size: 1,
              },
            },
          },
        },
      },
    },
  };

  const response = await ml.mlSystem.mlAnomalySearch(params);
  const anomalyScores: Array<{
    jobId: string;
    anomalyScore: number;
    timestamp: number;
  }> = response.aggregations.jobs.buckets.map((jobBucket: any) => {
    const jobId = jobBucket.key;
    const bucketSource = jobBucket.top_score_hits.hits.hits?.[0]?._source;
    return {
      jobId,
      anomalyScore: bucketSource.anomaly_score,
      timestamp: bucketSource.timestamp,
    };
  });
  const anomalyModelValuePromises = anomalyScores.map(
    ({ jobId, timestamp }) => {
      return (async () => {
        try {
          const modelPlotResponse = await ml.mlSystem.mlAnomalySearch({
            body: {
              size: 1,
              query: {
                bool: {
                  filter: [
                    { term: { result_type: 'model_plot' } },
                    { term: { job_id: jobId } },
                    { term: { timestamp } },
                  ],
                },
              },
              _source: ['actual', 'model_median'],
            },
          });
          if (modelPlotResponse.hits.hits.length === 0) {
            return;
          }
          const { actual, model_median } = modelPlotResponse.hits.hits[0]
            ._source as {
            actual: number;
            model_median: number;
          };
          return { jobId, actual, model_median };
        } catch (error) {
          return;
        }
      })();
    }
  );

  const anomalyModelValues = filterNonNullable(
    await Promise.all(anomalyModelValuePromises)
  );

  return leftJoin(
    apmMlJobCategories,
    'jobId',
    leftJoin(anomalyScores, 'jobId', anomalyModelValues)
  );
}

function filterNonNullable<T>(array: T[]) {
  return array.filter(
    (element) => element !== undefined || element !== null
  ) as Array<NonNullable<T>>;
}
