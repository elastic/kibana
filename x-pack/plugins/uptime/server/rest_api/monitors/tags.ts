/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMRestApiRouteFactory } from '../types';
import { UMServerLibs } from '../../lib/lib';
import { API_URLS } from '../../../common/constants';

export const createGetTagsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.MONITOR_TAGS,
  validate: false,
  handler: async ({ callES, dynamicSettings }, _context, _request, response): Promise<any> => {
    return response.ok({
      body: await libs.requests.getTags({ callES, dynamicSettings }),
    });
  },
});
