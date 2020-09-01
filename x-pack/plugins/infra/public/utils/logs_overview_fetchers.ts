/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { encode } from 'rison-node';
import { SearchResponse } from 'elasticsearch';
import {
  FetchData,
  FetchDataParams,
  HasData,
  LogsFetchDataResponse,
} from '../../../observability/public';
import { DEFAULT_SOURCE_ID } from '../../common/constants';
import { callFetchLogSourceConfigurationAPI } from '../containers/logs/log_source/api/fetch_log_source_configuration';
import { callFetchLogSourceStatusAPI } from '../containers/logs/log_source/api/fetch_log_source_status';
import { InfraClientCoreSetup, InfraClientStartDeps } from '../types';

interface StatsAggregation {
  buckets: Array<{
    key: string;
    doc_count: number;
    series: {
      buckets: Array<{
        key_as_string: string;
        key: number;
        doc_count: number;
      }>;
    };
  }>;
}

interface LogParams {
  index: string;
  timestampField: string;
}

type StatsAndSeries = Pick<LogsFetchDataResponse, 'stats' | 'series'>;

export function getLogsHasDataFetcher(
  getStartServices: InfraClientCoreSetup['getStartServices']
): HasData {
  return async () => {
    const [core] = await getStartServices();
    const sourceStatus = await callFetchLogSourceStatusAPI(DEFAULT_SOURCE_ID, core.http.fetch);
    return sourceStatus.data.logIndexStatus === 'available';
  };
}

export function getLogsOverviewDataFetcher(
  getStartServices: InfraClientCoreSetup['getStartServices']
): FetchData<LogsFetchDataResponse> {
  return async (params) => {
    const [core, startPlugins] = await getStartServices();
    const { data } = startPlugins;

    const sourceConfiguration = await callFetchLogSourceConfigurationAPI(
      DEFAULT_SOURCE_ID,
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

    const timeSpanInMinutes = (params.absoluteTime.end - params.absoluteTime.start) / (1000 * 60);

    return {
      appLink: `/app/logs/stream?logPosition=(end:${encode(params.relativeTime.end)},start:${encode(
        params.relativeTime.start
      )})`,
      stats: normalizeStats(stats, timeSpanInMinutes),
      series: normalizeSeries(series),
    };
  };
}

async function fetchLogsOverview(
  logParams: LogParams,
  params: FetchDataParams,
  dataPlugin: InfraClientStartDeps['data']
): Promise<StatsAndSeries> {
  return new Promise((resolve, reject) => {
    let esResponse: SearchResponse<any> | undefined;

    dataPlugin.search
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
        (response) => (esResponse = response.rawResponse),
        (error) => reject(error),
        () => {
          if (esResponse?.aggregations) {
            resolve(processLogsOverviewAggregations(esResponse!.aggregations));
          } else {
            resolve({ stats: {}, series: {} });
          }
        }
      );
  });
}

function buildLogOverviewQuery(logParams: LogParams, params: FetchDataParams) {
  return {
    range: {
      [logParams.timestampField]: {
        gt: new Date(params.absoluteTime.start).toISOString(),
        lte: new Date(params.absoluteTime.end).toISOString(),
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
        missing: 'unknown',
      },
      aggs: {
        series: {
          date_histogram: {
            field: logParams.timestampField,
            fixed_interval: params.bucketSize,
          },
        },
      },
    },
  };
}

function processLogsOverviewAggregations(aggregations: {
  stats: StatsAggregation;
}): StatsAndSeries {
  const processedStats: StatsAndSeries['stats'] = {};
  const processedSeries: StatsAndSeries['series'] = {};

  aggregations.stats.buckets.forEach((stat) => {
    const label = stat.key;

    processedStats[stat.key] = {
      type: 'number',
      label,
      value: stat.doc_count,
    };

    stat.series.buckets.forEach((series) => {
      processedSeries[label] = processedSeries[label] || { label, coordinates: [] };
      processedSeries[label].coordinates.push({
        x: series.key,
        y: series.doc_count,
      });
    });
  });

  return {
    stats: processedStats,
    series: processedSeries,
  };
}

function normalizeStats(
  stats: LogsFetchDataResponse['stats'],
  timeSpanInMinutes: number
): LogsFetchDataResponse['stats'] {
  return Object.keys(stats).reduce<LogsFetchDataResponse['stats']>((normalized, key) => {
    normalized[key] = {
      ...stats[key],
      value: stats[key].value / timeSpanInMinutes,
    };
    return normalized;
  }, {});
}

function normalizeSeries(series: LogsFetchDataResponse['series']): LogsFetchDataResponse['series'] {
  const seriesKeys = Object.keys(series);
  const timestamps = seriesKeys.flatMap((key) => series[key].coordinates.map((c) => c.x));
  const [first, second] = [...new Set(timestamps)].sort();
  const timeSpanInMinutes = (second - first) / (1000 * 60);

  return seriesKeys.reduce<LogsFetchDataResponse['series']>((normalized, key) => {
    normalized[key] = {
      ...series[key],
      coordinates: series[key].coordinates.map((c) => {
        if (c.y) {
          return { ...c, y: c.y / timeSpanInMinutes };
        }
        return c;
      }),
    };
    return normalized;
  }, {});
}
