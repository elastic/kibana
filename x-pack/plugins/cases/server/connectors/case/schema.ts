/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CommentType, ConnectorTypes } from '../../../common';
import { validateConnector } from './validators';

// Reserved for future implementation
export const CaseConfigurationSchema = schema.object({});

const ContextTypeUserSchema = schema.object({
  type: schema.literal(CommentType.user),
  comment: schema.string(),
  owner: schema.string(),
});

const ContextTypeAlertGroupSchema = schema.object({
  type: schema.literal(CommentType.generatedAlert),
  alerts: schema.string(),
  owner: schema.string(),
});

export type ContextTypeGeneratedAlertType = typeof ContextTypeAlertGroupSchema.type;

const ContextTypeAlertSchema = schema.object({
  type: schema.literal(CommentType.alert),
  // allowing either an array or a single value to preserve the previous API of attaching a single alert ID
  alertId: schema.oneOf([schema.arrayOf(schema.string()), schema.string()]),
  index: schema.string(),
  rule: schema.object({
    id: schema.nullable(schema.string()),
    name: schema.nullable(schema.string()),
  }),
  owner: schema.string(),
});

export type ContextTypeAlertSchemaType = typeof ContextTypeAlertSchema.type;

export const CommentSchema = schema.oneOf([
  ContextTypeUserSchema,
  ContextTypeAlertSchema,
  ContextTypeAlertGroupSchema,
]);

export type CommentSchemaType = typeof CommentSchema.type;

const JiraFieldsSchema = schema.object({
  issueType: schema.string(),
  priority: schema.nullable(schema.string()),
  parent: schema.nullable(schema.string()),
});

const ResilientFieldsSchema = schema.object({
  incidentTypes: schema.nullable(schema.arrayOf(schema.string())),
  severityCode: schema.nullable(schema.string()),
});

const ServiceNowITSMFieldsSchema = schema.object({
  impact: schema.nullable(schema.string()),
  severity: schema.nullable(schema.string()),
  urgency: schema.nullable(schema.string()),
  category: schema.nullable(schema.string()),
  subcategory: schema.nullable(schema.string()),
});

const ServiceNowSIRFieldsSchema = schema.object({
  destIp: schema.nullable(schema.boolean()),
  sourceIp: schema.nullable(schema.boolean()),
  malwareHash: schema.nullable(schema.boolean()),
  malwareUrl: schema.nullable(schema.boolean()),
  priority: schema.nullable(schema.string()),
  category: schema.nullable(schema.string()),
  subcategory: schema.nullable(schema.string()),
});

const SwimlaneFieldsSchema = schema.object({
  caseId: schema.nullable(schema.string()),
});

const NoneFieldsSchema = schema.nullable(schema.object({}));

const ReducedConnectorFieldsSchema: { [x: string]: any } = {
  [ConnectorTypes.jira]: JiraFieldsSchema,
  [ConnectorTypes.resilient]: ResilientFieldsSchema,
  [ConnectorTypes.serviceNowSIR]: ServiceNowSIRFieldsSchema,
  [ConnectorTypes.swimlane]: SwimlaneFieldsSchema,
};

export const ConnectorProps = {
  id: schema.string(),
  name: schema.string(),
  type: schema.oneOf([
    schema.literal(ConnectorTypes.jira),
    schema.literal(ConnectorTypes.none),
    schema.literal(ConnectorTypes.resilient),
    schema.literal(ConnectorTypes.serviceNowITSM),
    schema.literal(ConnectorTypes.serviceNowSIR),
    schema.literal(ConnectorTypes.swimlane),
  ]),
  // Chain of conditional schemes
  fields: Object.keys(ReducedConnectorFieldsSchema).reduce(
    (conditionalSchema, key) =>
      schema.conditional(
        schema.siblingRef('type'),
        key,
        ReducedConnectorFieldsSchema[key],
        conditionalSchema
      ),
    schema.conditional(
      schema.siblingRef('type'),
      ConnectorTypes.serviceNowITSM,
      ServiceNowITSMFieldsSchema,
      NoneFieldsSchema
    )
  ),
};

export const ConnectorSchema = schema.object(ConnectorProps);

const CaseBasicProps = {
  description: schema.string(),
  title: schema.string(),
  tags: schema.arrayOf(schema.string()),
  connector: schema.object(ConnectorProps, { validate: validateConnector }),
  settings: schema.object({ syncAlerts: schema.boolean() }),
};

const CaseUpdateRequestProps = {
  id: schema.string(),
  version: schema.string(),
  description: schema.nullable(CaseBasicProps.description),
  title: schema.nullable(CaseBasicProps.title),
  tags: schema.nullable(CaseBasicProps.tags),
  connector: schema.nullable(CaseBasicProps.connector),
  settings: schema.nullable(CaseBasicProps.settings),
  status: schema.nullable(schema.string()),
};

const CaseAddCommentRequestProps = {
  caseId: schema.string(),
  comment: CommentSchema,
};

export const ExecutorSubActionCreateParamsSchema = schema.object(CaseBasicProps);
export const ExecutorSubActionUpdateParamsSchema = schema.object(CaseUpdateRequestProps);
export const ExecutorSubActionAddCommentParamsSchema = schema.object(CaseAddCommentRequestProps);

export const CaseExecutorParamsSchema = schema.oneOf([
  schema.object({
    subAction: schema.literal('create'),
    subActionParams: ExecutorSubActionCreateParamsSchema,
  }),
  schema.object({
    subAction: schema.literal('update'),
    subActionParams: ExecutorSubActionUpdateParamsSchema,
  }),
  schema.object({
    subAction: schema.literal('addComment'),
    subActionParams: ExecutorSubActionAddCommentParamsSchema,
  }),
]);
