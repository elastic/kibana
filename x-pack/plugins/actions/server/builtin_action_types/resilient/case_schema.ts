/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const MappingActionType = schema.oneOf([
  schema.literal('nothing'),
  schema.literal('overwrite'),
  schema.literal('append'),
]);

export const MapRecordSchema = schema.object({
  source: schema.string(),
  target: schema.string(),
  actionType: MappingActionType,
});

export const IncidentConfigurationSchema = schema.object({
  mapping: schema.arrayOf(MapRecordSchema),
});

export const EntityInformation = {
  createdAt: schema.maybe(schema.string()),
  createdBy: schema.maybe(schema.any()),
  updatedAt: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.any()),
};

export const CommentSchema = schema.object({
  commentId: schema.string(),
  comment: schema.string(),
  ...EntityInformation,
});
