/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamsResponseSchema } from '../../../common/rest_types';
import { DATA_USAGE_DATA_STREAMS_API_ROUTE } from '../../../common';
import { DataUsageContext, DataUsageRouter } from '../../types';
import { getDataStreamsHandler } from './data_streams_handler';

export const registerDataStreamsRoute = (
  router: DataUsageRouter,
  dataUsageContext: DataUsageContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: DATA_USAGE_DATA_STREAMS_API_ROUTE,
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
};
