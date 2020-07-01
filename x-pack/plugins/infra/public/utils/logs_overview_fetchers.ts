/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraClientCoreSetup, InfraClientStartDeps } from '../types';
import {
  FetchData,
  LogsFetchDataResponse,
  HasData,
  FetchDataParams,
} from '../../../observability/public';
import { callFetchLogSourceConfigurationAPI } from '../containers/logs/log_source/api/fetch_log_source_configuration';
import { callFetchLogSourceStatusAPI } from '../containers/logs/log_source/api/fetch_log_source_status';

interface StatsAggregation {
  buckets: Array<{ key: string; doc_count: number }>;
}

interface SeriesAggregation {
  buckets: Array<{
    key_as_string: string;
    key: number;
    doc_count: number;
    dataset: StatsAggregation;
  }>;
}

interface LogParams {
  index: string;
  timestampField: string;
}

type StatsAndSeries = Pick<LogsFetchDataResponse, 'stats' | 'series'>;

const SOURCE_ID = 'default';

export function getLogsHasDataFetcher(
  getStartServices: InfraClientCoreSetup['getStartServices']
): HasData {
  return async () => {
    const [core] = await getStartServices();
    const sourceStatus = await callFetchLogSourceStatusAPI(SOURCE_ID, core.http.fetch);
    return sourceStatus.data.logIndexNames.length > 0;
  };
}

export function getLogsOverviewDataFetcher(
  getStartServices: InfraClientCoreSetup['getStartServices']
): FetchData<LogsFetchDataResponse> {
  return async (params) => {
    const [core, startPlugins] = await getStartServices();
    const { data } = startPlugins;

    const sourceConfiguration = await callFetchLogSourceConfigurationAPI(
      SOURCE_ID,
      core.http.fetch
    );

    const { stats, series } = await fetchLogsOverview(
      {
        index: sourceConfiguration.data.configuration.logAlias,
        timestampField: sourceConfiguration.data.configuration.fields.timestamp,
      },
      params,
      data
    );

    return {
      title: 'Log rate',
      appLink: 'TBD', // TODO: what format should this be in, relative I assume?
      stats,
      series,
    };
  };
}

async function fetchLogsOverview(
  logParams: LogParams,
  params: FetchDataParams,
  dataPlugin: InfraClientStartDeps['data']
): Promise<StatsAndSeries> {
  const esSearcher = dataPlugin.search.getSearchStrategy('es');
  return new Promise((resolve, reject) => {
    esSearcher
      .search({
        params: {
          index: logParams.index,
          body: {
            size: 0,
            query: buildLogOverviewQuery(logParams, params),
            aggs: buildLogOverviewAggregations(logParams, params),
          },
        },
      })
      .subscribe(
        (response) => {
          if (response.rawResponse.aggregations) {
            resolve(processLogsOverviewAggregations(response.rawResponse.aggregations));
          } else {
            resolve({ stats: {}, series: {} });
          }
        },
        (error) => reject(error)
      );
  });
}

function buildLogOverviewQuery(logParams: LogParams, params: FetchDataParams) {
  return {
    range: {
      [logParams.timestampField]: {
        gt: params.startTime,
        lte: params.endTime,
        format: 'strict_date_optional_time',
      },
    },
  };
}

function buildLogOverviewAggregations(logParams: LogParams, params: FetchDataParams) {
  return {
    stats: {
      terms: {
        field: 'event.dataset',
        size: 4,
      },
    },
    series: {
      date_histogram: {
        field: logParams.timestampField,
        fixed_interval: params.bucketSize,
      },
      aggs: {
        dataset: {
          terms: {
            field: 'event.dataset',
            size: 4,
          },
        },
      },
    },
  };
}

function processLogsOverviewAggregations(aggregations: {
  stats: StatsAggregation;
  series: SeriesAggregation;
}): StatsAndSeries {
  const processedStats = aggregations.stats.buckets.reduce<StatsAndSeries['stats']>(
    (result, bucket) => {
      result[bucket.key] = {
        type: 'number',
        label: bucket.key,
        value: bucket.doc_count,
      };

      return result;
    },
    {}
  );

  const processedSeries = aggregations.series.buckets.reduce<StatsAndSeries['series']>(
    (result, bucket) => {
      const x = bucket.key; // the timestamp of the bucket
      bucket.dataset.buckets.forEach((b) => {
        const label = b.key;
        result[label] = result[label] || { label, coordinates: [] };
        result[label].coordinates.push({ x, y: b.doc_count });
      });

      return result;
    },
    {}
  );

  return {
    stats: processedStats,
    series: processedSeries,
  };
}
