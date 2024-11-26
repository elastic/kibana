/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { DataUsageContext, DataUsageRequestHandlerContext } from '../../types';
import { errorHandler } from '../error_handler';
import { getMeteringStats } from '../../utils/get_metering_stats';

export const getDataStreamsHandler = (
  dataUsageContext: DataUsageContext
): RequestHandler<never, never, unknown, DataUsageRequestHandlerContext> => {
  const logger = dataUsageContext.logFactory.get('dataStreamsRoute');
  return async (context, _, response) => {
    logger.debug('Retrieving user data streams');

    try {
      const core = await context.core;
      const { datastreams: meteringStats } = await getMeteringStats(
        core.elasticsearch.client.asSecondaryAuthUser
      );

      const body =
        meteringStats && !!meteringStats.length
          ? meteringStats
              .sort((a, b) => b.size_in_bytes - a.size_in_bytes)
              .reduce<Array<{ name: string; storageSizeBytes: number }>>((acc, stat) => {
                if (stat.size_in_bytes > 0) {
                  acc.push({
                    name: stat.name,
                    storageSizeBytes: stat.size_in_bytes ?? 0,
                  });
                }
                return acc;
              }, [])
          : [];

      return response.ok({
        body,
      });
    } catch (error) {
      return errorHandler(logger, response, error);
    }
  };
};
