/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: schema.string(),
  orgId: schema.string(),
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

export const ExecutorSubActionPushParamsSchema = schema.object({
  incident: schema.object({
    name: schema.string(),
    description: schema.nullable(schema.string()),
    externalId: schema.nullable(schema.string()),
    incidentTypes: schema.nullable(schema.arrayOf(schema.number())),
    severityCode: schema.nullable(schema.number()),
  }),
  comments: schema.nullable(
    schema.arrayOf(
      schema.object({
        comment: schema.string(),
        commentId: schema.string(),
      })
    )
  ),
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
