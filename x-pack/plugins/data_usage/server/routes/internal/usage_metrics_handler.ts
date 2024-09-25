/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  DataUsageContext,
  DataUsageRequestHandlerContext,
  UsageMetricsRequestSchemaQueryParams,
} from '../../types';

import { errorHandler } from '../error_handler';

export const getUsageMetricsHandler = (
  dataUsageContext: DataUsageContext
): RequestHandler<
  never,
  UsageMetricsRequestSchemaQueryParams,
  unknown,
  DataUsageRequestHandlerContext
> => {
  const logger = dataUsageContext.logFactory.get('usageMetricsRoute');

  return async (context, request, response) => {
    try {
      const core = await context.core;
      const esClient = core.elasticsearch.client.asCurrentUser;

      // @ts-ignore
      const { from, to, metricTypes, dataStreams: dsNames, size } = request.query;
      logger.debug(`Retrieving usage metrics`);

      const { data_streams: dataStreamsResponse }: IndicesGetDataStreamResponse =
        await esClient.indices.getDataStream({
          name: '*',
          expand_wildcards: 'all',
        });

      const hasDataStreams = dataStreamsResponse.length > 0;
      let userDsNames: string[] = [];

      if (dsNames?.length) {
        userDsNames = typeof dsNames === 'string' ? [dsNames] : dsNames;
      } else if (!userDsNames.length && hasDataStreams) {
        userDsNames = dataStreamsResponse.map((ds) => ds.name);
      }

      // If no data streams are found, return an empty response
      if (!userDsNames.length) {
        return response.ok({
          body: {
            charts: [],
          },
        });
      }
      // TODO: fetch data from autoOps using userDsNames

      // mock data
      const charts = [
        {
          key: 'ingest_rate',
          series: [
            {
              streamName: 'data_stream_1',
              data: [
                { x: 1726858530000, y: 13756849 },
                { x: 1726862130000, y: 14657904 },
                { x: 1726865730000, y: 12798561 },
                { x: 1726869330000, y: 13578213 },
                { x: 1726872930000, y: 14123495 },
              ],
            },
            {
              streamName: 'data_stream_2',
              data: [
                { x: 1726858530000, y: 12894623 },
                { x: 1726862130000, y: 14436905 },
              ],
            },
            {
              streamName: 'data_stream_3',
              data: [{ x: 1726858530000, y: 12576413 }],
            },
          ],
        },
        {
          key: 'storage_retained',
          series: [
            {
              streamName: 'data_stream_1',
              data: [
                { x: 1726858530000, y: 12576413 },
                { x: 1726862130000, y: 13956423 },
                { x: 1726865730000, y: 14568945 },
                { x: 1726869330000, y: 14234856 },
                { x: 1726872930000, y: 14368942 },
              ],
            },
            {
              streamName: 'data_stream_2',
              data: [
                { x: 1726858530000, y: 12894623 },
                { x: 1726862130000, y: 14436905 },
                { x: 1726865730000, y: 13794805 },
              ],
            },
            {
              streamName: 'data_stream_3',
              data: [
                { x: 1726858530000, y: 12576413 },
                { x: 1726862130000, y: 13956423 },
                { x: 1726865730000, y: 14568945 },
                { x: 1726869330000, y: 14234856 },
                { x: 1726872930000, y: 14368942 },
                { x: 1726876530000, y: 13897654 },
                { x: 1726880130000, y: 14456989 },
                { x: 1726883730000, y: 14568956 },
                { x: 1726887330000, y: 13987562 },
                { x: 1726890930000, y: 14567894 },
                { x: 1726894530000, y: 14246789 },
              ],
            },
          ],
        },
      ];
      return response.ok({
        body: {
          charts,
        },
      });
    } catch (error) {
      return errorHandler(logger, response, error);
    }
  };
};
