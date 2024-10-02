/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';
import { MetricTypes, UsageMetricsRequestSchemaQueryParams } from '../../../common/rest_types';
import { DataUsageContext, DataUsageRequestHandlerContext } from '../../types';

import { errorHandler } from '../error_handler';

const formatStringParams = <T extends string>(value: T | T[]): T[] | MetricTypes[] =>
  typeof value === 'string' ? [value] : value;

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

      const charts = await fetchMetricsFromAutoOps({
        from,
        to,
        size,
        metricTypes: formatStringParams(metricTypes) as MetricTypes[],
        dataStreams: formatStringParams(userDsNames),
      });

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

const fetchMetricsFromAutoOps = async ({
  from,
  to,
  size,
  metricTypes,
  dataStreams,
}: {
  from: string;
  to: string;
  size?: number;
  metricTypes: MetricTypes[];
  dataStreams: string[];
}) => {
  // TODO: fetch data from autoOps using userDsNames

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
            { x: 1726876530000, y: 13876548 },
            { x: 1726880130000, y: 12894561 },
            { x: 1726883730000, y: 14478953 },
            { x: 1726887330000, y: 14678905 },
            { x: 1726890930000, y: 13976547 },
            { x: 1726894530000, y: 14568945 },
            { x: 1726898130000, y: 13789561 },
            { x: 1726901730000, y: 14478905 },
            { x: 1726905330000, y: 13956423 },
            { x: 1726908930000, y: 14598234 },
          ],
        },
        {
          streamName: 'data_stream_2',
          data: [
            { x: 1726858530000, y: 12894623 },
            { x: 1726862130000, y: 14436905 },
            { x: 1726865730000, y: 13794805 },
            { x: 1726869330000, y: 14048532 },
            { x: 1726872930000, y: 14237495 },
            { x: 1726876530000, y: 13745689 },
            { x: 1726880130000, y: 13974562 },
            { x: 1726883730000, y: 14234653 },
            { x: 1726887330000, y: 14323479 },
            { x: 1726890930000, y: 14023945 },
            { x: 1726894530000, y: 14189673 },
            { x: 1726898130000, y: 14247895 },
            { x: 1726901730000, y: 14098324 },
            { x: 1726905330000, y: 14478905 },
            { x: 1726908930000, y: 14323894 },
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
            { x: 1726898130000, y: 14567895 },
            { x: 1726901730000, y: 14457896 },
            { x: 1726905330000, y: 14567895 },
            { x: 1726908930000, y: 13989456 },
          ],
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
            { x: 1726876530000, y: 13897654 },
            { x: 1726880130000, y: 14456989 },
            { x: 1726883730000, y: 14568956 },
            { x: 1726887330000, y: 13987562 },
            { x: 1726890930000, y: 14567894 },
            { x: 1726894530000, y: 14246789 },
            { x: 1726898130000, y: 14567895 },
            { x: 1726901730000, y: 14457896 },
            { x: 1726905330000, y: 14567895 },
            { x: 1726908930000, y: 13989456 },
          ],
        },
        {
          streamName: 'data_stream_2',
          data: [
            { x: 1726858530000, y: 12894623 },
            { x: 1726862130000, y: 14436905 },
            { x: 1726865730000, y: 13794805 },
            { x: 1726869330000, y: 14048532 },
            { x: 1726872930000, y: 14237495 },
            { x: 1726876530000, y: 13745689 },
            { x: 1726880130000, y: 13974562 },
            { x: 1726883730000, y: 14234653 },
            { x: 1726887330000, y: 14323479 },
            { x: 1726890930000, y: 14023945 },
            { x: 1726894530000, y: 14189673 },
            { x: 1726898130000, y: 14247895 },
            { x: 1726901730000, y: 14098324 },
            { x: 1726905330000, y: 14478905 },
            { x: 1726908930000, y: 14323894 },
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
            { x: 1726898130000, y: 14567895 },
            { x: 1726901730000, y: 14457896 },
            { x: 1726905330000, y: 14567895 },
            { x: 1726908930000, y: 13989456 },
          ],
        },
        // Repeat similar structure for more data streams...
      ],
    },
  ];

  return charts;
};
