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
  UsageMetricsAutoOpsResponseSchema,
  UsageMetricsAutoOpsResponseSchemaBody,
  UsageMetricsRequestBody,
  UsageMetricsResponseSchemaBody,
} from '../../../common/rest_types';
import { DataUsageContext, DataUsageRequestHandlerContext } from '../../types';

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
}: {
  from: string;
  to: string;
  metricTypes: MetricTypes[];
  dataStreams: string[];
}) => {
  // TODO: fetch data from autoOps using userDsNames
  /*
    const response = await axios.post({AUTOOPS_URL}, {
      from: Date.parse(from),
      to: Date.parse(to),
      metric_types: metricTypes,
      allowed_indices: dataStreams,
    });
    const { data } = response;*/
  // mock data from autoOps https://github.com/elastic/autoops-services/blob/master/monitoring/service/specs/serverless_project_metrics_api.yaml
  const mockData = {
    metrics: {
      ingest_rate: [
        {
          name: 'metrics-apache_spark.driver-default',
          data: [
            [1726858530000, 13756849],
            [1726862130000, 14657904],
            [1726865730000, 12798561],
            [1726869330000, 13578213],
            [1726872930000, 14123495],
            [1726876530000, 13876548],
            [1726880130000, 12894561],
            [1726883730000, 14478953],
            [1726887330000, 14678905],
            [1726890930000, 13976547],
            [1726894530000, 14568945],
            [1726898130000, 13789561],
            [1726901730000, 14478905],
            [1726905330000, 13956423],
            [1726908930000, 14598234],
          ],
        },
        {
          name: 'logs-apm.app.adservice-default',
          data: [
            [1726858530000, 12894623],
            [1726862130000, 14436905],
            [1726865730000, 13794805],
            [1726869330000, 14048532],
            [1726872930000, 14237495],
            [1726876530000, 13745689],
            [1726880130000, 13974562],
            [1726883730000, 14234653],
            [1726887330000, 14323479],
            [1726890930000, 14023945],
            [1726894530000, 14189673],
            [1726898130000, 14247895],
            [1726901730000, 14098324],
            [1726905330000, 14478905],
            [1726908930000, 14323894],
          ],
        },
        {
          name: 'metrics-apm.app.aws-lambdas-default',
          data: [
            [1726858530000, 12576413],
            [1726862130000, 13956423],
            [1726865730000, 14568945],
            [1726869330000, 14234856],
            [1726872930000, 14368942],
            [1726876530000, 13897654],
            [1726880130000, 14456989],
            [1726883730000, 14568956],
            [1726887330000, 13987562],
            [1726890930000, 14567894],
            [1726894530000, 14246789],
            [1726898130000, 14567895],
            [1726901730000, 14457896],
            [1726905330000, 14567895],
            [1726908930000, 13989456],
          ],
        },
      ],
      storage_retained: [
        {
          name: 'metrics-apache_spark.driver-default',
          data: [
            [1726858530000, 12576413],
            [1726862130000, 13956423],
            [1726865730000, 14568945],
            [1726869330000, 14234856],
            [1726872930000, 14368942],
            [1726876530000, 13897654],
            [1726880130000, 14456989],
            [1726883730000, 14568956],
            [1726887330000, 13987562],
            [1726890930000, 14567894],
            [1726894530000, 14246789],
            [1726898130000, 14567895],
            [1726901730000, 14457896],
            [1726905330000, 14567895],
            [1726908930000, 13989456],
          ],
        },
        {
          name: 'logs-apm.app.adservice-default',
          data: [
            [1726858530000, 12894623],
            [1726862130000, 14436905],
            [1726865730000, 13794805],
            [1726869330000, 14048532],
            [1726872930000, 14237495],
            [1726876530000, 13745689],
            [1726880130000, 13974562],
            [1726883730000, 14234653],
            [1726887330000, 14323479],
            [1726890930000, 14023945],
            [1726894530000, 14189673],
            [1726898130000, 14247895],
            [1726901730000, 14098324],
            [1726905330000, 14478905],
            [1726908930000, 14323894],
          ],
        },
        {
          name: 'metrics-apm.app.aws-lambdas-default',
          data: [
            [1726858530000, 12576413],
            [1726862130000, 13956423],
            [1726865730000, 14568945],
            [1726869330000, 14234856],
            [1726872930000, 14368942],
            [1726876530000, 13897654],
            [1726880130000, 14456989],
            [1726883730000, 14568956],
            [1726887330000, 13987562],
            [1726890930000, 14567894],
            [1726894530000, 14246789],
            [1726898130000, 14567895],
            [1726901730000, 14457896],
            [1726905330000, 14567895],
            [1726908930000, 13989456],
          ],
        },
      ],
    },
  };
  // Make sure data is what we expect
  const validatedData = UsageMetricsAutoOpsResponseSchema.body().validate(mockData);

  return validatedData;
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
