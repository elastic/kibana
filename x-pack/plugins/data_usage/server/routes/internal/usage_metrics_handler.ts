/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';
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

      if (!requestDsNames?.length) {
        return errorHandler(
          logger,
          response,
          new CustomHttpRequestError('[request body.dataStreams]: no data streams selected', 400)
        );
      }

      const { data_streams: dataStreamsResponse }: IndicesGetDataStreamResponse =
        await esClient.indices.getDataStream({
          name: requestDsNames,
          expand_wildcards: 'all',
        });
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

function transformMetricsData(
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
