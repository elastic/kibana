/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ExternalIncidentServiceConfiguration = {
  url: schema.string(),
  incident: schema.string(), // JSON.stringified object
};

export const ExternalIncidentServiceConfigurationSchema = schema.object(
  ExternalIncidentServiceConfiguration
);

export const ExternalIncidentServiceSecretConfiguration = {
  user: schema.string(),
  password: schema.string(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = schema.object(
  ExternalIncidentServiceSecretConfiguration
);

export const ExecutorSubActionPushParamsSchema = schema.object({
  incident: schema.object({
    summary: schema.string(),
    description: schema.nullable(schema.string()),
    labels: schema.nullable(
      schema.arrayOf(
        schema.string({
          validate: (label) =>
            // Matches any space, tab or newline character.
            label.match(/\s/g) ? `The label ${label} cannot contain spaces` : undefined,
        })
      )
    ),
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

export const ExecutorParamsSchema = schema.oneOf([
  schema.object({
    subAction: schema.literal('pushToService'),
    subActionParams: ExecutorSubActionPushParamsSchema,
  }),
]);
