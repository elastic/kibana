/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_ALERTS_GROUPING_KEY } from './config';

export const ExternalIncidentServiceConfigurationBase = {
  apiUrl: schema.string(),
};

export const ExternalIncidentServiceConfiguration = {
  ...ExternalIncidentServiceConfigurationBase,
  usesTableApi: schema.boolean({ defaultValue: true }),
};

export const ExternalIncidentServiceConfigurationBaseSchema = schema.object(
  ExternalIncidentServiceConfigurationBase
);

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
  correlation_id: schema.nullable(schema.string({ defaultValue: DEFAULT_ALERTS_GROUPING_KEY })),
  correlation_display: schema.nullable(schema.string()),
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
    dest_ip: schema.oneOf(
      [schema.nullable(schema.string()), schema.nullable(schema.arrayOf(schema.string()))],
      { defaultValue: null }
    ),
    malware_hash: schema.oneOf(
      [schema.nullable(schema.string()), schema.nullable(schema.arrayOf(schema.string()))],
      { defaultValue: null }
    ),
    malware_url: schema.oneOf(
      [schema.nullable(schema.string()), schema.nullable(schema.arrayOf(schema.string()))],
      { defaultValue: null }
    ),
    source_ip: schema.oneOf(
      [schema.nullable(schema.string()), schema.nullable(schema.arrayOf(schema.string()))],
      { defaultValue: null }
    ),
    priority: schema.nullable(schema.string()),
  }),
  comments: CommentsSchema,
});

// Schema for ServiceNow ITOM
export const ExecutorSubActionAddEventParamsSchema = schema.object({
  source: schema.nullable(schema.string()),
  event_class: schema.nullable(schema.string()),
  resource: schema.nullable(schema.string()),
  node: schema.nullable(schema.string()),
  metric_name: schema.nullable(schema.string()),
  type: schema.nullable(schema.string()),
  severity: schema.nullable(schema.string()),
  description: schema.nullable(schema.string()),
  additional_info: schema.nullable(schema.string()),
  message_key: schema.nullable(schema.string({ defaultValue: DEFAULT_ALERTS_GROUPING_KEY })),
  time_of_event: schema.nullable(schema.string()),
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

// Executor parameters for ITOM
export const ExecutorParamsSchemaITOM = schema.oneOf([
  schema.object({
    subAction: schema.literal('addEvent'),
    subActionParams: ExecutorSubActionAddEventParamsSchema,
  }),
  schema.object({
    subAction: schema.literal('getChoices'),
    subActionParams: ExecutorSubActionGetChoicesParamsSchema,
  }),
]);
