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
import { DataUsageContext, DataUsageRequestHandlerContext } from '../../types';
import { AutoOpsAPIService, autoopsApiService } from '../../services/autoops_api';

import { errorHandler } from '../error_handler';
import { CustomHttpRequestError } from '../../utils';

const formatStringParams = <T extends string>(value: T | T[]): T[] | MetricTypes[] =>
  typeof value === 'string' ? [value] : value;

export const getUsageMetricsHandler = (
  dataUsageContext: DataUsageContext
): RequestHandler<never, unknown, UsageMetricsRequestBody, DataUsageRequestHandlerContext> => {
  const logger = dataUsageContext.logFactory.get('usageMetricsRoute');

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

      const metrics = await fetchMetricsFromAutoOps({
        from,
        to,
        metricTypes: formatStringParams(metricTypes) as MetricTypes[],
        dataStreams: formatStringParams(dataStreamsResponse.map((ds) => ds.name)),
        autoOpsAPIService: autoopsApiService,
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

const fetchMetricsFromAutoOps = async ({
  from,
  to,
  metricTypes,
  dataStreams,
  autoOpsAPIService,
}: {
  from: string;
  to: string;
  metricTypes: MetricTypes[];
  dataStreams: string[];
  autoOpsAPIService: AutoOpsAPIService;
}) => {
  // Call AutoOpsAPIService to fetch metrics
  const response = await autoOpsAPIService?.autoOpsUsageMetricsAPI({
    from,
    to,
    metricTypes,
    dataStreams,
  });
  return response.data;
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
