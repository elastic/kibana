/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const connectorResponseSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  config: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  connector_type_id: schema.string(),
  is_missing_secrets: schema.maybe(schema.boolean()),
  is_preconfigured: schema.boolean(),
  is_deprecated: schema.boolean(),
  is_system_action: schema.boolean(),
});

export const allConnectorsResponseSchema = connectorResponseSchema.extends({
  referenced_by_count: schema.number(),
});

export const connectorTypesResponseSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  enabled: schema.boolean(),
  enabled_in_config: schema.boolean(),
  enabled_in_license: schema.boolean(),
  minimum_license_required: schema.oneOf([
    schema.literal('basic'),
    schema.literal('standard'),
    schema.literal('gold'),
    schema.literal('platinum'),
    schema.literal('enterprise'),
    schema.literal('trial'),
  ]),
  supported_feature_ids: schema.arrayOf(schema.string()),
  is_system_action_type: schema.boolean(),
});
