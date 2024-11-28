/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import { RequestHandler } from '@kbn/core/server';
import { parseToMoment } from '../../../common/utils';
import type {
  MetricTypes,
  UsageMetricsAutoOpsResponseSchemaBody,
  UsageMetricsRequestBody,
  UsageMetricsResponseSchemaBody,
} from '../../../common/rest_types';
import { DataUsageContext, DataUsageRequestHandlerContext } from '../../types';

import { errorHandler } from '../error_handler';
import { CustomHttpRequestError } from '../../utils';
import { DataUsageService } from '../../services';

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
      const getDataStreams = (name: string[]) =>
        esClient.indices.getDataStream({ name, expand_wildcards: 'all' });

      logger.debug(`Retrieving usage metrics`);
      const { from, to, metricTypes, dataStreams: requestDsNames } = request.body;

      // parse date strings to validate
      const parsedFrom = parseToMoment(from)?.toISOString();
      const parsedTo = parseToMoment(to)?.toISOString();

      if (!parsedFrom || !parsedTo) {
        const customErrorMessage = `[request body.${
          !parsedTo ? 'to' : 'from'
        }] Invalid date range ${!parsedTo ? to : from} is out of range`;
        return errorHandler(logger, response, new CustomHttpRequestError(customErrorMessage, 400));
      }

      // redundant check as we don't allow making requests via UI without data streams,
      // but it's here to make sure the request body is validated before requesting metrics from auto-ops
      if (!requestDsNames?.length) {
        return errorHandler(
          logger,
          response,
          new CustomHttpRequestError('[request body.dataStreams]: no data streams selected', 400)
        );
      }

      let dataStreamsResponse: Array<{ name: string }>;

      try {
        if (requestDsNames.length <= 50) {
          logger.debug(`Retrieving usage metrics`);
          const { data_streams: dataStreams } = await getDataStreams(requestDsNames);
          dataStreamsResponse = dataStreams;
        } else {
          logger.debug(`Retrieving usage metrics in chunks of 50`);
          // Attempt to fetch data streams in chunks of 50
          const dataStreamsChunks = Math.ceil(requestDsNames.length / 50);
          const chunkedDsLists = chunk(dataStreamsChunks, requestDsNames);
          const chunkedDataStreams = await Promise.all(
            chunkedDsLists.map((dsList) => getDataStreams(dsList))
          );
          dataStreamsResponse = chunkedDataStreams.flatMap((ds) => ds.data_streams);
        }
      } catch (error) {
        return errorHandler(
          logger,
          response,
          new CustomHttpRequestError('Failed to retrieve data streams', 400)
        );
      }

      const dataUsageService = new DataUsageService(logger);
      const metrics = await dataUsageService.getMetrics({
        from: parsedFrom,
        to: parsedTo,
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
  return Object.fromEntries(
    Object.entries(data).map(([metricType, series]) => [
      metricType,
      series.map((metricSeries) => ({
        name: metricSeries.name,
        data: (metricSeries.data as Array<[number, number]>).map(([timestamp, value]) => ({
          x: timestamp,
          y: value,
        })),
      })),
    ])
  ) as UsageMetricsResponseSchemaBody;
}
