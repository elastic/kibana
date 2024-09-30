/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataUsageContext, DataUsageRouter, DataStreamsResponseSchema } from '../../types';

import { getDataStreamsHandler } from './data_streams_handler';

export const registerDataStreamsRoute = (
  router: DataUsageRouter,
  dataUsageContext: DataUsageContext
) => {
  if (dataUsageContext.serverConfig.enabled) {
    router.versioned
      .get({
        access: 'internal',
        path: '/internal/api/data_usage/data_streams',
      })
      .addVersion(
        {
          version: '1',
          validate: {
            request: {},
            response: {
              200: DataStreamsResponseSchema,
            },
          },
        },
        getDataStreamsHandler(dataUsageContext)
      );
  }
};
