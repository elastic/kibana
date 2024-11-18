/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import {
  MetricTypes,
  UsageMetricsAutoOpsResponseSchemaBody,
  UsageMetricsRequestBody,
  UsageMetricsResponseSchemaBody,
} from '../../../common/rest_types';
import { DataUsageRequestHandlerContext } from '../../types';
import { DataUsageService } from '../../services';

import { errorHandler } from '../error_handler';
import { CustomHttpRequestError } from '../../utils';

const formatStringParams = <T extends string>(value: T | T[]): T[] | MetricTypes[] =>
  typeof value === 'string' ? [value] : value;

export const getUsageMetricsHandler = (
  dataUsageService: DataUsageService
): RequestHandler<never, unknown, UsageMetricsRequestBody, DataUsageRequestHandlerContext> => {
  const logger = dataUsageService.getLogger('usageMetricsRoute');

  return async (context, request, response) => {
    try {
      const core = await context.core;
      const esClient = core.elasticsearch.client.asCurrentUser;

      logger.debug(`Retrieving usage metrics`);
      const { from, to, metricTypes, dataStreams: requestDsNames } = request.body;

      // redundant check as we don't allow making requests via UI without data streams,
      // but it's here to make sure the request body is validated before requesting metrics from auto-ops
      if (!requestDsNames?.length) {
        return errorHandler(
          logger,
          response,
          new CustomHttpRequestError('[request body.dataStreams]: no data streams selected', 400)
        );
      }
      let dataStreamsResponse;

      try {
        // Attempt to fetch data streams
        const { data_streams: dataStreams } = await esClient.indices.getDataStream({
          name: requestDsNames,
          expand_wildcards: 'all',
        });
        dataStreamsResponse = dataStreams;
      } catch (error) {
        return errorHandler(
          logger,
          response,
          new CustomHttpRequestError('Failed to retrieve data streams', 400)
        );
      }
      const metrics = await dataUsageService.getMetrics({
        from,
        to,
        metricTypes: formatStringParams(metricTypes) as MetricTypes[],
        dataStreams: formatStringParams(dataStreamsResponse.map((ds) => ds.name)),
      });

      const body = transformMetricsData(metrics);

      return response.ok({
        body,
      });
    } catch (error) {
      logger.error(`Error retrieving usage metrics: ${error.message}`);
      return errorHandler(logger, response, error);
    }
  };
};

export function transformMetricsData(
  data: UsageMetricsAutoOpsResponseSchemaBody
): UsageMetricsResponseSchemaBody {
  return {
    metrics: Object.fromEntries(
      Object.entries(data.metrics).map(([metricType, series]) => [
        metricType,
        series.map((metricSeries) => ({
          name: metricSeries.name,
          data: (metricSeries.data as Array<[number, number]>).map(([timestamp, value]) => ({
            x: timestamp,
            y: value,
          })),
        })),
      ])
    ),
  };
}
