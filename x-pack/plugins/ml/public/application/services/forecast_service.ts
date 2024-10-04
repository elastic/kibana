/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Service for carrying out requests to run ML forecasts and to obtain
// data on forecasts that have been performed.
import { useMemo } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { get, find, each } from 'lodash';
import { map } from 'rxjs';
import type { MlApi } from './ml_api_service';
import type { Job } from '../../../common/types/anomaly_detection_jobs';
import { useMlKibana } from '../contexts/kibana';

export interface AggType {
  avg: string;
  max: string;
  min: string;
}

export function forecastServiceFactory(mlApi: MlApi) {
  // Gets a basic summary of the most recently run forecasts for the specified
  // job, with results at or later than the supplied timestamp.
  // Extra query object can be supplied, or pass null if no additional query.
  // Returned response contains a forecasts property, which is an array of objects
  // containing id, earliest and latest keys.
  function getForecastsSummary(job: Job, query: any, earliestMs: number, maxResults: any) {
    return new Promise((resolve, reject) => {
      const obj: { success: boolean; forecasts: Record<string, any> } = {
        success: true,
        forecasts: [],
      };

      // Build the criteria to use in the bool filter part of the request.
      // Add criteria for the job ID, result type and earliest time, plus
      // the additional query if supplied.
      const filterCriteria = [
        {
          term: { result_type: 'model_forecast_request_stats' },
        },
        {
          term: { job_id: job.job_id },
        },
        {
          range: {
            timestamp: {
              gte: earliestMs,
              format: 'epoch_millis',
            },
          },
        },
      ];

      if (query) {
        filterCriteria.push(query);
      }

      mlApi.results
        .anomalySearch(
          {
            // @ts-expect-error SearchRequest type has not been updated to include size
            size: maxResults,
            body: {
              query: {
                bool: {
                  filter: filterCriteria,
                },
              },
              sort: [{ forecast_create_timestamp: { order: 'desc' } }],
            },
          },
          [job.job_id]
        )
        .then((resp) => {
          if (resp.hits.total.value > 0) {
            obj.forecasts = resp.hits.hits.map((hit) => hit._source);
          }

          resolve(obj);
        })
        .catch((resp) => {
          reject(resp);
        });
    });
  }
  // Obtains the earliest and latest timestamps for the forecast data from
  // the forecast with the specified ID.
  // Returned response contains earliest and latest properties which are the
  // timestamps of the first and last model_forecast results.
  function getForecastDateRange(
    job: Job,
    forecastId: string
  ): Promise<{ success: boolean; earliest: number | null; latest: number | null }> {
    return new Promise((resolve, reject) => {
      const obj = {
        success: true,
        earliest: null,
        latest: null,
      };

      // Build the criteria to use in the bool filter part of the request.
      // Add criteria for the job ID, forecast ID, result type and time range.
      const filterCriteria = [
        {
          query_string: {
            query: 'result_type:model_forecast',
            analyze_wildcard: true,
          },
        },
        {
          term: { job_id: job.job_id },
        },
        {
          term: { forecast_id: forecastId },
        },
      ];

      // TODO - add in criteria for detector index and entity fields (by, over, partition)
      // once forecasting with these parameters is supported.

      mlApi.results
        .anomalySearch(
          {
            // @ts-expect-error SearchRequest type has not been updated to include size
            size: 0,
            body: {
              query: {
                bool: {
                  filter: filterCriteria,
                },
              },
              aggs: {
                earliest: {
                  min: {
                    field: 'timestamp',
                  },
                },
                latest: {
                  max: {
                    field: 'timestamp',
                  },
                },
              },
            },
          },
          [job.job_id]
        )
        .then((resp) => {
          obj.earliest = get(resp, 'aggregations.earliest.value', null);
          obj.latest = get(resp, 'aggregations.latest.value', null);
          if (obj.earliest === null || obj.latest === null) {
            reject(resp);
          } else {
            resolve(obj);
          }
        })
        .catch((resp) => {
          reject(resp);
        });
    });
  }
  // Obtains the requested forecast model data for the forecast with the specified ID.
  function getForecastData(
    job: Job,
    detectorIndex: number,
    forecastId: string,
    entityFields: any,
    earliestMs: number,
    latestMs: number,
    intervalMs: number,
    aggType?: AggType
  ) {
    // Extract the partition, by, over fields on which to filter.
    const criteriaFields = [];
    const detector = job.analysis_config.detectors[detectorIndex];
    if (detector.partition_field_name !== undefined) {
      const partitionEntity = find(entityFields, { fieldName: detector.partition_field_name });
      if (partitionEntity !== undefined) {
        criteriaFields.push(
          { fieldName: 'partition_field_name', fieldValue: partitionEntity.fieldName },
          { fieldName: 'partition_field_value', fieldValue: partitionEntity.fieldValue }
        );
      }
    }

    if (detector.over_field_name !== undefined) {
      const overEntity = find(entityFields, { fieldName: detector.over_field_name });
      if (overEntity !== undefined) {
        criteriaFields.push(
          { fieldName: 'over_field_name', fieldValue: overEntity.fieldName },
          { fieldName: 'over_field_value', fieldValue: overEntity.fieldValue }
        );
      }
    }

    if (detector.by_field_name !== undefined) {
      const byEntity = find(entityFields, { fieldName: detector.by_field_name });
      if (byEntity !== undefined) {
        criteriaFields.push(
          { fieldName: 'by_field_name', fieldValue: byEntity.fieldName },
          { fieldName: 'by_field_value', fieldValue: byEntity.fieldValue }
        );
      }
    }

    const obj: { success: boolean; results: Record<number, any> } = {
      success: true,
      results: {},
    };

    // Build the criteria to use in the bool filter part of the request.
    // Add criteria for the job ID, forecast ID, detector index, result type and time range.
    const filterCriteria: estypes.QueryDslQueryContainer[] = [
      {
        query_string: {
          query: 'result_type:model_forecast',
          analyze_wildcard: true,
        },
      },
      {
        term: { job_id: job.job_id },
      },
      {
        term: { forecast_id: forecastId },
      },
      {
        term: { detector_index: detectorIndex },
      },
      {
        range: {
          timestamp: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis',
          },
        },
      },
    ];

    // Add in term queries for each of the specified criteria.
    each(criteriaFields, (criteria) => {
      filterCriteria.push({
        term: {
          [criteria.fieldName]: criteria.fieldValue,
        },
      });
    });

    // If an aggType object has been passed in, use it.
    // Otherwise default to avg, min and max aggs for the
    // forecast prediction, upper and lower
    const forecastAggs =
      aggType === undefined
        ? { avg: 'avg', max: 'max', min: 'min' }
        : {
            avg: aggType.avg,
            max: aggType.max,
            min: aggType.min,
          };

    return mlApi.results
      .anomalySearch$(
        {
          // @ts-expect-error SearchRequest type has not been updated to include size
          size: 0,
          body: {
            query: {
              bool: {
                filter: filterCriteria,
              },
            },
            aggs: {
              times: {
                date_histogram: {
                  field: 'timestamp',
                  fixed_interval: `${intervalMs}ms`,
                  min_doc_count: 1,
                },
                aggs: {
                  prediction: {
                    [forecastAggs.avg]: {
                      field: 'forecast_prediction',
                    },
                  },
                  forecastUpper: {
                    [forecastAggs.max]: {
                      field: 'forecast_upper',
                    },
                  },
                  forecastLower: {
                    [forecastAggs.min]: {
                      field: 'forecast_lower',
                    },
                  },
                },
              },
            },
          },
        },
        [job.job_id]
      )
      .pipe(
        map((resp) => {
          const aggregationsByTime = get(resp, ['aggregations', 'times', 'buckets'], []);
          each(aggregationsByTime, (dataForTime) => {
            const time = dataForTime.key;
            obj.results[time] = {
              prediction: get(dataForTime, ['prediction', 'value']),
              forecastUpper: get(dataForTime, ['forecastUpper', 'value']),
              forecastLower: get(dataForTime, ['forecastLower', 'value']),
            };
          });

          return obj;
        })
      );
  }
  // Runs a forecast
  function runForecast(jobId: string, duration?: string, neverExpires?: boolean) {
    // eslint-disable-next-line no-console
    console.log('ML forecast service run forecast with duration:', duration);
    return new Promise((resolve, reject) => {
      mlApi
        .forecast({
          jobId,
          duration,
          neverExpires,
        })
        .then((resp) => {
          resolve(resp);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  // Gets stats for a forecast that has been run on the specified job.
  // Returned response contains a stats property, including
  // forecast_progress (a value from 0 to 1),
  // and forecast_status ('finished' when complete) properties.
  function getForecastRequestStats(job: Job, forecastId: string) {
    return new Promise((resolve, reject) => {
      const obj = {
        success: true,
        stats: {},
      };

      // Build the criteria to use in the bool filter part of the request.
      // Add criteria for the job ID, result type and earliest time.
      const filterCriteria = [
        {
          query_string: {
            query: 'result_type:model_forecast_request_stats',
            analyze_wildcard: true,
          },
        },
        {
          term: { job_id: job.job_id },
        },
        {
          term: { forecast_id: forecastId },
        },
      ];

      mlApi.results
        .anomalySearch(
          {
            // @ts-expect-error SearchRequest type has not been updated to include size
            size: 1,
            body: {
              query: {
                bool: {
                  filter: filterCriteria,
                },
              },
            },
          },
          [job.job_id]
        )
        .then((resp) => {
          if (resp.hits.total.value > 0) {
            obj.stats = resp.hits.hits[0]._source;
          }
          resolve(obj);
        })
        .catch((resp) => {
          reject(resp);
        });
    });
  }

  return {
    getForecastsSummary,
    getForecastDateRange,
    getForecastData,
    runForecast,
    getForecastRequestStats,
  };
}

export type MlForecastService = ReturnType<typeof forecastServiceFactory>;

export function useForecastService(): MlForecastService {
  const {
    services: {
      mlServices: { mlApi },
    },
  } = useMlKibana();

  const mlForecastService = useMemo(() => forecastServiceFactory(mlApi), [mlApi]);
  return mlForecastService;
}
