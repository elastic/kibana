/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  /*
   * This will default to true up until the last minor before the next major.
   * In readonly mode, the user will not be able to perform any actions in the UI
   * and will be presented with a message indicating as such.
   */
  readonly: schema.boolean({ defaultValue: true }),
});

export type Config = TypeOf<typeof configSchema>;
