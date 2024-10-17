/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ElasticsearchClient, RequestHandler } from '@kbn/core/server';
import { DataUsageContext, DataUsageRequestHandlerContext } from '../../types';
import { errorHandler } from '../error_handler';

export interface MeteringStats {
  name: string;
  num_docs: number;
  size_in_bytes: number;
}

interface MeteringStatsResponse {
  datastreams: MeteringStats[];
}

const getMeteringStats = (client: ElasticsearchClient) => {
  return client.transport.request<MeteringStatsResponse>({
    method: 'GET',
    path: '/_metering/stats',
  });
};

export const getDataStreamsHandler = (
  dataUsageContext: DataUsageContext
): RequestHandler<never, unknown, DataUsageRequestHandlerContext> => {
  const logger = dataUsageContext.logFactory.get('dataStreamsRoute');

  return async (context, _, response) => {
    logger.debug('Retrieving user data streams');

    try {
      const core = await context.core;
      const { datastreams: meteringStats } = await getMeteringStats(
        core.elasticsearch.client.asSecondaryAuthUser
      );

      const body = meteringStats
        .sort((a, b) => b.size_in_bytes - a.size_in_bytes)
        .map((stat) => ({
          name: stat.name,
          storageSizeBytes: stat.size_in_bytes,
        }));

      return response.ok({
        body,
      });
    } catch (error) {
      return errorHandler(logger, response, error);
    }
  };
};
