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
import {
  VALUE_MUST_BE_GREATER_THAN_ZERO,
  VALUE_MUST_BE_AN_INTEGER,
} from '../../common/translations';

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

export const validateCertsValues = (
  settings: DynamicSettings
): Record<string, string> | undefined => {
  const errors: any = {};
  if (settings.certAgeThreshold <= 0) {
    errors.certAgeThreshold = VALUE_MUST_BE_GREATER_THAN_ZERO;
  } else if (settings.certAgeThreshold % 1) {
    errors.certAgeThreshold = VALUE_MUST_BE_AN_INTEGER;
  }
  if (settings.certExpirationThreshold <= 0) {
    errors.certExpirationThreshold = VALUE_MUST_BE_GREATER_THAN_ZERO;
  } else if (settings.certExpirationThreshold % 1) {
    errors.certExpirationThreshold = VALUE_MUST_BE_AN_INTEGER;
  }
  if (errors.certAgeThreshold || errors.certExpirationThreshold) {
    return errors;
  }
};

export const createPostDynamicSettingsRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'POST',
  path: '/api/uptime/dynamic_settings',
  validate: {
    body: schema.object({
      heartbeatIndices: schema.string(),
      certAgeThreshold: schema.number(),
      certExpirationThreshold: schema.number(),
    }),
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient }, _context, request, response): Promise<any> => {
    const decoded = DynamicSettingsType.decode(request.body);
    const certThresholdErrors = validateCertsValues(request.body as DynamicSettings);

    if (isRight(decoded) && !certThresholdErrors) {
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
        body: JSON.stringify(certThresholdErrors) || error,
      });
    }
  },
});
