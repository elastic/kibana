/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { CommentSchema, EntityInformation, IncidentConfigurationSchema } from './case_shema';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: schema.string(),
  // TODO: to remove - set it optional for the current stage to support Case ServiceNow implementation
  incidentConfiguration: schema.nullable(IncidentConfigurationSchema),
  isCaseOwned: schema.maybe(schema.boolean()),
};

export const ExternalIncidentServiceConfigurationSchema = schema.object(
  ExternalIncidentServiceConfiguration
);

export const ExternalIncidentServiceSecretConfiguration = {
  password: schema.string(),
  username: schema.string(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = schema.object(
  ExternalIncidentServiceSecretConfiguration
);

export const ExecutorSubActionSchema = schema.oneOf([
  schema.literal('getIncident'),
  schema.literal('pushToService'),
  schema.literal('handshake'),
]);

export const ExecutorSubActionPushParamsSchema = schema.object({
  savedObjectId: schema.string(),
  title: schema.string(),
  description: schema.nullable(schema.string()),
  comment: schema.nullable(schema.string()),
  externalId: schema.nullable(schema.string()),
  severity: schema.nullable(schema.string()),
  urgency: schema.nullable(schema.string()),
  impact: schema.nullable(schema.string()),
  // TODO: remove later  - need for support Case push multiple comments
  comments: schema.maybe(schema.arrayOf(CommentSchema)),
  ...EntityInformation,
});

export const ExecutorSubActionGetIncidentParamsSchema = schema.object({
  externalId: schema.string(),
});

// Reserved for future implementation
export const ExecutorSubActionHandshakeParamsSchema = schema.object({});

export const ExecutorParamsSchema = schema.oneOf([
  schema.object({
    subAction: schema.literal('getIncident'),
    subActionParams: ExecutorSubActionGetIncidentParamsSchema,
  }),
  schema.object({
    subAction: schema.literal('handshake'),
    subActionParams: ExecutorSubActionHandshakeParamsSchema,
  }),
  schema.object({
    subAction: schema.literal('pushToService'),
    subActionParams: ExecutorSubActionPushParamsSchema,
  }),
]);
