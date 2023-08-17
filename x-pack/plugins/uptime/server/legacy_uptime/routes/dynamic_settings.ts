/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { UMServerLibs } from '../lib/lib';
import { DynamicSettings, DynamicSettingsCodec } from '../../../common/runtime_types';
import { DynamicSettingsAttributes } from '../../runtime_types/settings';
import { UMRestApiRouteFactory } from '.';
import { savedObjectsAdapter } from '../lib/saved_objects/saved_objects';
import {
  VALUE_MUST_BE_GREATER_THAN_ZERO,
  VALUE_MUST_BE_AN_INTEGER,
} from '../../../common/translations';
import { API_URLS } from '../../../common/constants';

export const createGetDynamicSettingsRoute: UMRestApiRouteFactory<DynamicSettings> = (
  _libs: UMServerLibs
) => ({
  method: 'GET',
  path: API_URLS.DYNAMIC_SETTINGS,
  validate: false,
  handler: async ({ savedObjectsClient }) => {
    const dynamicSettingsAttributes: DynamicSettingsAttributes =
      await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);
    return {
      heartbeatIndices: dynamicSettingsAttributes.heartbeatIndices,
      certExpirationThreshold: dynamicSettingsAttributes.certExpirationThreshold,
      certAgeThreshold: dynamicSettingsAttributes.certAgeThreshold,
      defaultConnectors: dynamicSettingsAttributes.defaultConnectors,
      defaultEmail: dynamicSettingsAttributes.defaultEmail,
    };
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

export const createPostDynamicSettingsRoute: UMRestApiRouteFactory = (_libs: UMServerLibs) => ({
  method: 'POST',
  path: API_URLS.DYNAMIC_SETTINGS,
  validate: {
    body: schema.object({
      heartbeatIndices: schema.string(),
      certAgeThreshold: schema.number(),
      certExpirationThreshold: schema.number(),
      defaultConnectors: schema.arrayOf(schema.string()),
      defaultEmail: schema.maybe(
        schema.object({
          to: schema.arrayOf(schema.string()),
          cc: schema.maybe(schema.arrayOf(schema.string())),
          bcc: schema.maybe(schema.arrayOf(schema.string())),
        })
      ),
    }),
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request, response }): Promise<any> => {
    const decoded = DynamicSettingsCodec.decode(request.body);
    const certThresholdErrors = validateCertsValues(request.body as DynamicSettings);

    if (isRight(decoded) && !certThresholdErrors) {
      const newSettings: DynamicSettings = decoded.right;
      await savedObjectsAdapter.setUptimeDynamicSettings(
        savedObjectsClient,
        newSettings as DynamicSettingsAttributes
      );

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
