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
  id: schema.string(),
});

// Reserved for future implementation
export const ExecutorSubActionCommonFieldsParamsSchema = schema.object({});
export const ExecutorSubActionHandshakeParamsSchema = schema.object({});
export const ExecutorSubActionGetIncidentTypesParamsSchema = schema.object({});
export const ExecutorSubActionGetSeverityParamsSchema = schema.object({});

const ArrayOfValuesSchema = schema.arrayOf(
  schema.object(
    {
      value: schema.number(),
      label: schema.string(),
    },
    { unknowns: 'allow' }
  )
);

export const GetIncidentTypesResponseSchema = schema.object(
  {
    values: ArrayOfValuesSchema,
  },
  { unknowns: 'allow' }
);

export const GetSeverityResponseSchema = schema.object(
  {
    values: ArrayOfValuesSchema,
  },
  { unknowns: 'allow' }
);

export const ExternalServiceFieldsSchema = schema.object(
  {
    input_type: schema.string(),
    name: schema.string(),
    read_only: schema.boolean(),
    required: schema.nullable(schema.string()),
    text: schema.string(),
  },
  { unknowns: 'allow' }
);

export const GetCommonFieldsResponseSchema = schema.arrayOf(ExternalServiceFieldsSchema);

export const ExternalServiceIncidentResponseSchema = schema.object({
  id: schema.string(),
  title: schema.string(),
  url: schema.string(),
  pushedDate: schema.string(),
});
