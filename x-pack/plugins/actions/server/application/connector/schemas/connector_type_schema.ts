/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const connectorTypeSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  enabled: schema.boolean(),
  enabledInConfig: schema.boolean(),
  enabledInLicense: schema.boolean(),
  minimumLicenseRequired: schema.oneOf([
    schema.literal('basic'),
    schema.literal('standard'),
    schema.literal('gold'),
    schema.literal('platinum'),
    schema.literal('enterprise'),
    schema.literal('trial'),
  ]),
  supportedFeatureIds: schema.arrayOf(schema.string()),
  isSystemActionType: schema.boolean(),
});
