/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { UMServerLibs } from '../lib/lib';
import { DynamicSettings, DynamicSettingsType } from '../../common/runtime_types';
import { UMRestApiRouteFactory } from '.';
import { savedObjectsAdapter } from '../lib/saved_objects';

export const createGetDynamicSettingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/dynamic_settings',
  validate: false,
  handler: async ({ dynamicSettings }, _context, _request, response): Promise<any> => {
    return response.ok({
      body: dynamicSettings,
    });
  },
});

export const createPostDynamicSettingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'POST',
  path: '/api/uptime/dynamic_settings',
  validate: {
    body: schema.object({}, { unknowns: 'allow' }),
  },
  writeAccess: true,
  options: {
    tags: ['access:uptime-write'],
  },
  handler: async ({ savedObjectsClient }, _context, request, response): Promise<any> => {
    const decoded = DynamicSettingsType.decode(request.body);
    if (isRight(decoded)) {
      const newSettings: DynamicSettings = decoded.right;
      await savedObjectsAdapter.setUptimeDynamicSettings(savedObjectsClient, newSettings);

      return response.ok({
        body: {
          success: true,
        },
      });
    } else {
      const error = PathReporter.report(decoded).join(', ');
      return response.badRequest({
        body: error,
      });
    }
  },
});
