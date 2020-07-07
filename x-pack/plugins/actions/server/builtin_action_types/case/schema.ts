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

export const CaseConfigurationSchema = schema.object({
  mapping: schema.arrayOf(MapRecordSchema),
});

export const ExternalIncidentServiceConfiguration = {
  apiUrl: schema.string(),
  casesConfiguration: CaseConfigurationSchema,
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

export const UserSchema = schema.object({
  fullName: schema.nullable(schema.string()),
  username: schema.nullable(schema.string()),
});

const EntityInformation = {
  createdAt: schema.string(),
  createdBy: UserSchema,
  updatedAt: schema.nullable(schema.string()),
  updatedBy: schema.nullable(UserSchema),
};

export const EntityInformationSchema = schema.object(EntityInformation);

export const CommentSchema = schema.object({
  commentId: schema.string(),
  comment: schema.string(),
  ...EntityInformation,
});

export const ExecutorSubActionSchema = schema.oneOf([
  schema.literal('getIncident'),
  schema.literal('pushToService'),
  schema.literal('handshake'),
]);

export const ExecutorSubActionPushParamsSchema = schema.object({
  savedObjectId: schema.string(),
  title: schema.string(),
  description: schema.nullable(schema.string()),
  comments: schema.nullable(schema.arrayOf(CommentSchema)),
  externalId: schema.nullable(schema.string()),
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
