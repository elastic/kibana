/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { CommentSchema, EntityInformation, IncidentConfigurationSchema } from '../case/schema';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: schema.string(),
  projectKey: schema.string(),
  // TODO: to remove - set it optional for the current stage to support Case Jira implementation
  incidentConfiguration: schema.nullable(IncidentConfigurationSchema),
  isCaseOwned: schema.nullable(schema.boolean()),
};

export const ExternalIncidentServiceConfigurationSchema = schema.object(
  ExternalIncidentServiceConfiguration
);

export const ExternalIncidentServiceSecretConfiguration = {
  email: schema.string(),
  apiToken: schema.string(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = schema.object(
  ExternalIncidentServiceSecretConfiguration
);

export const ExecutorSubActionSchema = schema.oneOf([
  schema.literal('getIncident'),
  schema.literal('pushToService'),
  schema.literal('handshake'),
  schema.literal('issueTypes'),
  schema.literal('fieldsByIssueType'),
]);

export const ExecutorSubActionPushParamsSchema = schema.object({
  savedObjectId: schema.nullable(schema.string()),
  title: schema.string(),
  description: schema.nullable(schema.string()),
  externalId: schema.nullable(schema.string()),
  issueType: schema.nullable(schema.string()),
  priority: schema.nullable(schema.string()),
  labels: schema.nullable(schema.arrayOf(schema.string())),
  parent: schema.nullable(schema.string()),
  // TODO: modify later to string[] - need for support Case schema
  comments: schema.nullable(schema.arrayOf(CommentSchema)),
  ...EntityInformation,
});

export const ExecutorSubActionGetIncidentParamsSchema = schema.object({
  externalId: schema.string(),
});

// Reserved for future implementation
export const ExecutorSubActionCommonFieldsParamsSchema = schema.object({});
export const ExecutorSubActionHandshakeParamsSchema = schema.object({});
export const ExecutorSubActionGetCapabilitiesParamsSchema = schema.object({});
export const ExecutorSubActionGetIssueTypesParamsSchema = schema.object({});
export const ExecutorSubActionGetFieldsByIssueTypeParamsSchema = schema.object({
  id: schema.string(),
});
export const ExecutorSubActionGetIssuesParamsSchema = schema.object({ title: schema.string() });
export const ExecutorSubActionGetIssueParamsSchema = schema.object({ id: schema.string() });

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
    subAction: schema.literal('issueTypes'),
    subActionParams: ExecutorSubActionGetIssueTypesParamsSchema,
  }),
  schema.object({
    subAction: schema.literal('fieldsByIssueType'),
    subActionParams: ExecutorSubActionGetFieldsByIssueTypeParamsSchema,
  }),
  schema.object({
    subAction: schema.literal('issues'),
    subActionParams: ExecutorSubActionGetIssuesParamsSchema,
  }),
  schema.object({
    subAction: schema.literal('issue'),
    subActionParams: ExecutorSubActionGetIssueParamsSchema,
  }),
]);
