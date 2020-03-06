/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const MapsSchema = schema.object({
  source: schema.string(),
  target: schema.string(),
  onEditAndUpdate: schema.oneOf([
    schema.literal('nothing'),
    schema.literal('overwrite'),
    schema.literal('append'),
  ]),
});

export const CasesConfigurationSchema = schema.object({
  closure: schema.oneOf([
    schema.literal('manual'),
    schema.literal('newIncident'),
    schema.literal('closedIncident'),
  ]),
  mapping: schema.arrayOf(MapsSchema),
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

export const CommentSchema = schema.object({
  commentId: schema.string(),
  comment: schema.string(),
  version: schema.maybe(schema.string()),
  incidentCommentId: schema.maybe(schema.string()),
});

export const ExecutorAction = schema.oneOf([
  schema.literal('newIncident'),
  schema.literal('updateIncident'),
]);

export const ParamsSchema = schema.object({
  caseId: schema.string(),
  comments: schema.maybe(schema.arrayOf(CommentSchema)),
  description: schema.maybe(schema.string()),
  title: schema.maybe(schema.string()),
  incidentId: schema.maybe(schema.string()),
});
