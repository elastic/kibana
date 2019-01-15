/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { PingResults } from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';

export const createGetAllRoute = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/pings',
  options: {
    validate: {
      query: Joi.object({
        dateRangeStart: Joi.number().required(),
        dateRangeEnd: Joi.number().required(),
        monitorId: Joi.string(),
        size: Joi.number(),
        sort: Joi.string(),
        status: Joi.string(),
      }),
    },
  },
  handler: async (request: any): Promise<PingResults> => {
    const { size, sort, dateRangeStart, dateRangeEnd, monitorId, status } = request.query;
    return await libs.pings.getAll(
      request,
      dateRangeStart,
      dateRangeEnd,
      monitorId,
      status,
      sort,
      size
    );
  },
});
