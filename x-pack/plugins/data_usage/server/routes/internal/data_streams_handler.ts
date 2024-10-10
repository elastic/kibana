/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { DataUsageContext, DataUsageRequestHandlerContext } from '../../types';

import { errorHandler } from '../error_handler';

export const getDataStreamsHandler = (
  dataUsageContext: DataUsageContext
): RequestHandler<never, unknown, DataUsageRequestHandlerContext> => {
  const logger = dataUsageContext.logFactory.get('dataStreamsRoute');

  return async (context, _, response) => {
    logger.debug(`Retrieving user data streams`);

    try {
      const core = await context.core;
      const esClient = core.elasticsearch.client.asCurrentUser;

      const { data_streams: dataStreamsResponse } = await esClient.indices.dataStreamsStats({
        name: '*',
        expand_wildcards: 'all',
      });

      const sorted = dataStreamsResponse
        .sort((a, b) => b.store_size_bytes - a.store_size_bytes)
        .map((dataStream) => ({
          name: dataStream.data_stream,
          storageSizeBytes: dataStream.store_size_bytes,
        }));
      return response.ok({
        body: sorted,
      });
    } catch (error) {
      return errorHandler(logger, response, error);
    }
  };
};
