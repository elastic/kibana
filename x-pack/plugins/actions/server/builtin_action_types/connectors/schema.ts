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

export const ConnectorPublicConfiguration = {
  apiUrl: schema.string(),
  casesConfiguration: CaseConfigurationSchema,
};

export const ConnectorPublicConfigurationSchema = schema.object(ConnectorPublicConfiguration);

export const ConnectorSecretConfiguration = {
  password: schema.string(),
  username: schema.string(),
};

export const ConnectorSecretConfigurationSchema = schema.object(ConnectorSecretConfiguration);

export const UserSchema = schema.object({
  fullName: schema.oneOf([schema.nullable(schema.string()), schema.maybe(schema.string())]),
  username: schema.oneOf([schema.nullable(schema.string()), schema.maybe(schema.string())]),
  email: schema.oneOf([schema.nullable(schema.string()), schema.maybe(schema.string())]),
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
  version: schema.maybe(schema.string()),
  ...EntityInformation,
});

export const ExecutorActionSchema = schema.oneOf([
  schema.literal('getIncident'),
  schema.literal('pushToService'),
  schema.literal('handshake'),
]);

export const ExecutorActionParams = {
  caseId: schema.string(),
  title: schema.string(),
  description: schema.maybe(schema.string()),
  comments: schema.maybe(schema.arrayOf(CommentSchema)),
  externalCaseId: schema.nullable(schema.string()),
  ...EntityInformation,
};

export const ExecutorActionParamsSchema = schema.object(ExecutorActionParams);

export const ExecutorParamsSchema = schema.object({
  action: ExecutorActionSchema,
  actionParams: ExecutorActionParamsSchema,
});
