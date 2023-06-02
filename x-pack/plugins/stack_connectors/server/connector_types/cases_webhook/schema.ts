/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CasesWebhookMethods } from './types';
import { nullableType } from '../lib/nullable';

const HeadersSchema = schema.recordOf(schema.string(), schema.string());

export const ExternalIncidentServiceConfiguration = {
  createIncidentUrl: schema.string(),
  createIncidentMethod: schema.oneOf(
    [schema.literal(CasesWebhookMethods.POST), schema.literal(CasesWebhookMethods.PUT)],
    {
      defaultValue: CasesWebhookMethods.POST,
    }
  ),
  createIncidentJson: schema.string(), // stringified object
  createIncidentResponseKey: schema.string(),
  getIncidentUrl: schema.string(),
  getIncidentResponseExternalTitleKey: schema.string(),
  viewIncidentUrl: schema.string(),
  updateIncidentUrl: schema.string(),
  updateIncidentMethod: schema.oneOf(
    [
      schema.literal(CasesWebhookMethods.POST),
      schema.literal(CasesWebhookMethods.PATCH),
      schema.literal(CasesWebhookMethods.PUT),
    ],
    {
      defaultValue: CasesWebhookMethods.PUT,
    }
  ),
  updateIncidentJson: schema.string(),
  createCommentUrl: schema.nullable(schema.string()),
  createCommentMethod: schema.nullable(
    schema.oneOf(
      [
        schema.literal(CasesWebhookMethods.POST),
        schema.literal(CasesWebhookMethods.PUT),
        schema.literal(CasesWebhookMethods.PATCH),
      ],
      {
        defaultValue: CasesWebhookMethods.PUT,
      }
    )
  ),
  createCommentJson: schema.nullable(schema.string()),
  headers: nullableType(HeadersSchema),
  hasAuth: schema.boolean({ defaultValue: true }),
};

export const ExternalIncidentServiceConfigurationSchema = schema.object(
  ExternalIncidentServiceConfiguration
);

export const ExternalIncidentServiceSecretConfiguration = {
  user: schema.nullable(schema.string()),
  password: schema.nullable(schema.string()),
};

export const ExternalIncidentServiceSecretConfigurationSchema = schema.object(
  ExternalIncidentServiceSecretConfiguration
);

export const ExecutorSubActionPushParamsSchema = schema.object({
  incident: schema.object({
    title: schema.string(),
    description: schema.nullable(schema.string()),
    externalId: schema.nullable(schema.string()),
    tags: schema.nullable(schema.arrayOf(schema.string())),
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
