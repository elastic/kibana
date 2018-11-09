/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { Ping } from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';

export const createGetAllRoute = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime_monitoring/pings',
  options: {
    validate: {
      query: Joi.object({
        size: Joi.number(),
        sort: Joi.string(),
      }),
    },
  },
  handler: async (request: any): Promise<Ping[]> => {
    const { size, sort } = request.query;
    return await libs.pings.getAll(request, sort, size);
  },
});
