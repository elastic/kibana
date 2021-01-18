/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

export const createGetIndexStatusRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.INDEX_STATUS,
  validate: {
    query: schema.object({
      _debug: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ uptimeEsClient }): Promise<any> => {
    return await libs.requests.getIndexStatus({ uptimeEsClient });
  },
});
