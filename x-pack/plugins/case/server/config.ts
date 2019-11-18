/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  indexPattern: schema.string({ defaultValue: '.case-test-2' }),
  secret: schema.string({ defaultValue: 'Cool secret huh?' }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
