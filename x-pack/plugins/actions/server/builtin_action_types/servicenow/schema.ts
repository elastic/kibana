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

export const ExternalIncidentServiceConfiguration = {
  apiUrl: schema.string(),
  // did it otional for the current stage to support Case ServiceNow implementation
  incidentConfiguration: schema.maybe(IncidentConfigurationSchema),
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
  comments: schema.nullable(schema.string()),
  externalId: schema.nullable(schema.string()),
  severity: schema.nullable(schema.string()),
  urgency: schema.nullable(schema.string()),
  impact: schema.nullable(schema.string()),
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
