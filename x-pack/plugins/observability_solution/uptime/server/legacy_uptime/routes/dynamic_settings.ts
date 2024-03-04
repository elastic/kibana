/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../lib/lib';
import { DynamicSettings } from '../../../common/runtime_types';
import { DynamicSettingsAttributes } from '../../runtime_types/settings';
import { UMRestApiRouteFactory } from '.';
import { savedObjectsAdapter } from '../lib/saved_objects/saved_objects';
import { VALUE_MUST_BE_AN_INTEGER } from '../../../common/translations';
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
    return fromAttribute(dynamicSettingsAttributes);
  },
});

export const validateInteger = (value: number): string | undefined => {
  if (value % 1) {
    return VALUE_MUST_BE_AN_INTEGER;
  }
};

export const DynamicSettingsSchema = schema.object({
  heartbeatIndices: schema.maybe(schema.string({ minLength: 1 })),
  certAgeThreshold: schema.maybe(schema.number({ min: 1, validate: validateInteger })),
  certExpirationThreshold: schema.maybe(schema.number({ min: 1, validate: validateInteger })),
  defaultConnectors: schema.maybe(schema.arrayOf(schema.string())),
  defaultEmail: schema.maybe(
    schema.object({
      to: schema.arrayOf(schema.string()),
      cc: schema.maybe(schema.arrayOf(schema.string())),
      bcc: schema.maybe(schema.arrayOf(schema.string())),
    })
  ),
});

export const createPostDynamicSettingsRoute: UMRestApiRouteFactory = (_libs: UMServerLibs) => ({
  method: 'PUT',
  path: API_URLS.DYNAMIC_SETTINGS,
  validate: {
    body: DynamicSettingsSchema,
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request }): Promise<DynamicSettingsAttributes> => {
    const newSettings = request.body;
    const prevSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);

    const attr = await savedObjectsAdapter.setUptimeDynamicSettings(savedObjectsClient, {
      ...prevSettings,
      ...newSettings,
    } as DynamicSettingsAttributes);

    return fromAttribute(attr);
  },
});

const fromAttribute = (attr: DynamicSettingsAttributes) => {
  return {
    heartbeatIndices: attr.heartbeatIndices,
    certExpirationThreshold: attr.certExpirationThreshold,
    certAgeThreshold: attr.certAgeThreshold,
    defaultConnectors: attr.defaultConnectors,
    defaultEmail: attr.defaultEmail,
  };
};
