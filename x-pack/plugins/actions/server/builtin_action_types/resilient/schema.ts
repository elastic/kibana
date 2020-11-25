/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { CommentSchema, EntityInformation, IncidentConfigurationSchema } from '../case/schema';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: schema.string(),
  orgId: schema.string(),
  // TODO: to remove - set it optional for the current stage to support Case implementation
  incidentConfiguration: schema.nullable(IncidentConfigurationSchema),
  isCaseOwned: schema.nullable(schema.boolean()),
};

export const ExternalIncidentServiceConfigurationSchema = schema.object(
  ExternalIncidentServiceConfiguration
);

export const ExternalIncidentServiceSecretConfiguration = {
  apiKeyId: schema.string(),
  apiKeySecret: schema.string(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = schema.object(
  ExternalIncidentServiceSecretConfiguration
);

export const ExecutorSubActionSchema = schema.oneOf([
  schema.literal('getIncident'),
  schema.literal('pushToService'),
  schema.literal('handshake'),
  schema.literal('incidentTypes'),
  schema.literal('severity'),
]);

export const ExecutorSubActionPushParamsSchema = schema.object({
  savedObjectId: schema.nullable(schema.string()),
  title: schema.string(),
  description: schema.nullable(schema.string()),
  externalId: schema.nullable(schema.string()),
  incidentTypes: schema.nullable(schema.arrayOf(schema.number())),
  severityCode: schema.nullable(schema.number()),
  // TODO: remove later  - need for support Case push multiple comments
  comments: schema.nullable(schema.arrayOf(CommentSchema)),
  ...EntityInformation,
});

export const ExecutorSubActionGetIncidentParamsSchema = schema.object({
  externalId: schema.string(),
});

// Reserved for future implementation
export const ExecutorSubActionCommonFieldsParamsSchema = schema.object({});
export const ExecutorSubActionHandshakeParamsSchema = schema.object({});
export const ExecutorSubActionGetIncidentTypesParamsSchema = schema.object({});
export const ExecutorSubActionGetSeverityParamsSchema = schema.object({});

export const ExecutorParamsSchema = schema.oneOf([
  schema.object({
    subAction: schema.literal('getFields'),
    subActionParams: ExecutorSubActionCommonFieldsParamsSchema,
  }),
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
  schema.object({
    subAction: schema.literal('incidentTypes'),
    subActionParams: ExecutorSubActionGetIncidentTypesParamsSchema,
  }),
  schema.object({
    subAction: schema.literal('severity'),
    subActionParams: ExecutorSubActionGetSeverityParamsSchema,
  }),
]);
