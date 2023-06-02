/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const productLineId = schema.oneOf([
  schema.literal('securityEssentials'),
  schema.literal('securityComplete'),
]);
export type SecurityProductLineId = TypeOf<typeof productLineId>;

export const productLineIds = schema.arrayOf<SecurityProductLineId>(productLineId, {
  defaultValue: ['securityEssentials'],
});
export type SecurityProductLineIds = TypeOf<typeof productLineIds>;
