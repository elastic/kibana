/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { WhitelistedHosts, EnabledActionTypes } from './actions_config';

const preconfiguredActionSchema = schema.object({
  name: schema.string({ minLength: 1 }),
  actionTypeId: schema.string({ minLength: 1 }),
  config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  secrets: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  whitelistedHosts: schema.arrayOf(
    schema.oneOf([schema.string({ hostname: true }), schema.literal(WhitelistedHosts.Any)]),
    {
      defaultValue: [WhitelistedHosts.Any],
    }
  ),
  enabledActionTypes: schema.arrayOf(
    schema.oneOf([schema.string(), schema.literal(EnabledActionTypes.Any)]),
    {
      defaultValue: [WhitelistedHosts.Any],
    }
  ),
  preconfigured: schema.recordOf(schema.string(), preconfiguredActionSchema, {
    defaultValue: {},
    validate: validatePreconfigured,
  }),
});

export type ActionsConfig = TypeOf<typeof configSchema>;

const invalidActionIds = new Set(['', '__proto__', 'constructor']);

function validatePreconfigured(preconfigured: Record<string, unknown>): string | undefined {
  // check for ids that should not be used
  for (const id of Object.keys(preconfigured)) {
    if (invalidActionIds.has(id)) {
      return `invalid preconfigured action id "${id}"`;
    }
  }

  // in case __proto__ was used as a preconfigured action id ...
  if (Object.getPrototypeOf(preconfigured) !== Object.getPrototypeOf({})) {
    return `invalid preconfigured action id "__proto__"`;
  }
}
