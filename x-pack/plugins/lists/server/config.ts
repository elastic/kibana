/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf, schema } from '@kbn/config-schema';

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  listIndex: schema.string({ defaultValue: '.lists' }),
  listItemIndex: schema.string({ defaultValue: '.items' }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
