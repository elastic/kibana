/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: schema.string(),
  projectKey: schema.string(),
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

export const ExecutorSubActionPushParamsSchema = schema.object({
  incident: schema.object({
    summary: schema.string(),
    description: schema.nullable(schema.string()),
    externalId: schema.nullable(schema.string()),
    issueType: schema.nullable(schema.string()),
    priority: schema.nullable(schema.string()),
    labels: schema.nullable(
      schema.arrayOf(
        schema.string({
          validate: (label) =>
            // Matches any space, tab or newline character.
            label.match(/\s/g) ? `The label ${label} cannot contain spaces` : undefined,
        })
      )
    ),
    parent: schema.nullable(schema.string()),
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
