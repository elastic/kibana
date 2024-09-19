/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { ENTITY_LATEST, entitiesAliasPattern } from '@kbn/entities-schema';

export const entityTypeRt = t.union([
  t.literal('service'),
  t.literal('host'),
  t.literal('container'),
]);

export type EntityType = t.TypeOf<typeof entityTypeRt>;

export const MAX_NUMBER_OF_ENTITIES = 500;

export const ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: '*',
  dataset: ENTITY_LATEST,
});
