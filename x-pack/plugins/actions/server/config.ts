/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { WhitelistedHosts, EnabledActionTypes } from './actions_config';

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
});

export type ActionsConfig = TypeOf<typeof configSchema>;
