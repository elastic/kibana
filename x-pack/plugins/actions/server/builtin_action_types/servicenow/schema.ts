/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const MapEntrySchema = schema.object({
  source: schema.string(),
  target: schema.string(),
  actionType: schema.oneOf([
    schema.literal('nothing'),
    schema.literal('overwrite'),
    schema.literal('append'),
  ]),
});

export const CasesConfigurationSchema = schema.object({
  mapping: schema.arrayOf(MapEntrySchema),
});

export const ConfigSchemaProps = {
  apiUrl: schema.string(),
  casesConfiguration: CasesConfigurationSchema,
};

export const ConfigSchema = schema.object(ConfigSchemaProps);

export const SecretsSchemaProps = {
  password: schema.string(),
  username: schema.string(),
};

export const SecretsSchema = schema.object(SecretsSchemaProps);

export const UserSchema = schema.object({
  fullName: schema.nullable(schema.string()),
  username: schema.string(),
});

const EntityInformationSchemaProps = {
  createdAt: schema.string(),
  createdBy: UserSchema,
  updatedAt: schema.nullable(schema.string()),
  updatedBy: schema.nullable(UserSchema),
};

export const EntityInformationSchema = schema.object(EntityInformationSchemaProps);

export const CommentSchema = schema.object({
  commentId: schema.string(),
  comment: schema.string(),
  version: schema.maybe(schema.string()),
  ...EntityInformationSchemaProps,
});

export const ExecutorAction = schema.oneOf([
  schema.literal('newIncident'),
  schema.literal('updateIncident'),
]);

export const ParamsSchema = schema.object({
  caseId: schema.string(),
  title: schema.string(),
  comments: schema.maybe(schema.arrayOf(CommentSchema)),
  description: schema.maybe(schema.string()),
  incidentId: schema.nullable(schema.string()),
  ...EntityInformationSchemaProps,
});
