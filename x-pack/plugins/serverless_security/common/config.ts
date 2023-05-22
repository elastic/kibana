/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const projectSku = schema.oneOf([
  schema.literal('endpointEssentials'),
  schema.literal('cloudEssentials'),
]);
export type ServerlessSecuritySku = TypeOf<typeof projectSku>;

export const projectSkus = schema.arrayOf<ServerlessSecuritySku>(projectSku, {
  defaultValue: ['endpointEssentials'],
});
export type ServerlessSecuritySkus = TypeOf<typeof projectSkus>;
