/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: schema.string(),
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

const CommentsSchema = schema.nullable(
  schema.arrayOf(
    schema.object({
      comment: schema.string(),
      commentId: schema.string(),
    })
  )
);

const CommonAttributes = {
  short_description: schema.string(),
  description: schema.nullable(schema.string()),
  externalId: schema.nullable(schema.string()),
  category: schema.nullable(schema.string()),
  subcategory: schema.nullable(schema.string()),
};

// Schema for ServiceNow Incident Management (ITSM)
export const ExecutorSubActionPushParamsSchemaITSM = schema.object({
  incident: schema.object({
    ...CommonAttributes,
    severity: schema.nullable(schema.string()),
    urgency: schema.nullable(schema.string()),
    impact: schema.nullable(schema.string()),
  }),
  comments: CommentsSchema,
});

// Schema for ServiceNow Security Incident Response (SIR)
export const ExecutorSubActionPushParamsSchemaSIR = schema.object({
  incident: schema.object({
    ...CommonAttributes,
    dest_ip: schema.nullable(schema.string()),
    malware_hash: schema.nullable(schema.string()),
    malware_url: schema.nullable(schema.string()),
    source_ip: schema.nullable(schema.string()),
    priority: schema.nullable(schema.string()),
  }),
  comments: CommentsSchema,
});

export const ExecutorSubActionGetIncidentParamsSchema = schema.object({
  externalId: schema.string(),
});

// Reserved for future implementation
export const ExecutorSubActionHandshakeParamsSchema = schema.object({});
export const ExecutorSubActionCommonFieldsParamsSchema = schema.object({});
export const ExecutorSubActionGetChoicesParamsSchema = schema.object({
  fields: schema.arrayOf(schema.string()),
});

// Executor parameters for ServiceNow Incident Management (ITSM)
export const ExecutorParamsSchemaITSM = schema.oneOf([
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
    subActionParams: ExecutorSubActionPushParamsSchemaITSM,
  }),
  schema.object({
    subAction: schema.literal('getChoices'),
    subActionParams: ExecutorSubActionGetChoicesParamsSchema,
  }),
]);

// Executor parameters for ServiceNow Security Incident Response (SIR)
export const ExecutorParamsSchemaSIR = schema.oneOf([
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
    subActionParams: ExecutorSubActionPushParamsSchemaSIR,
  }),
  schema.object({
    subAction: schema.literal('getChoices'),
    subActionParams: ExecutorSubActionGetChoicesParamsSchema,
  }),
]);
