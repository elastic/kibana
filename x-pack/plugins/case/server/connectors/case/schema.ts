/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateConnector } from './validators';

// Reserved for future implementation
export const CaseConfigurationSchema = schema.object({});

const ContextTypeUserSchema = schema.object({
  type: schema.literal('user'),
  comment: schema.string(),
});

/**
 * ContextTypeAlertSchema has been deleted.
 * Comments of type alert need the siem signal index.
 * Case connector is not being passed the context which contains the
 * security solution app client which in turn provides the siem signal index.
 * For that reason, we disable comments of type alert for the case connector until
 * we figure out how to pass the security solution app client to the connector.
 * See: x-pack/plugins/case/server/connectors/case/index.ts L76.
 *
 * The schema:
 *
 * const ContextTypeAlertSchema = schema.object({
 *  type: schema.literal('alert'),
 *  alertId: schema.string(),
 *  index: schema.string(),
 * });
 *
 * Issue: https://github.com/elastic/kibana/issues/85750
 *  */

export const CommentSchema = schema.oneOf([ContextTypeUserSchema]);

const JiraFieldsSchema = schema.object({
  issueType: schema.string(),
  priority: schema.nullable(schema.string()),
  parent: schema.nullable(schema.string()),
});

const ResilientFieldsSchema = schema.object({
  incidentTypes: schema.nullable(schema.arrayOf(schema.string())),
  severityCode: schema.nullable(schema.string()),
});

const ServiceNowFieldsSchema = schema.object({
  impact: schema.nullable(schema.string()),
  severity: schema.nullable(schema.string()),
  urgency: schema.nullable(schema.string()),
});

const NoneFieldsSchema = schema.nullable(schema.object({}));

const ReducedConnectorFieldsSchema: { [x: string]: any } = {
  '.jira': JiraFieldsSchema,
  '.resilient': ResilientFieldsSchema,
};

export const ConnectorProps = {
  id: schema.string(),
  name: schema.string(),
  type: schema.oneOf([
    schema.literal('.servicenow'),
    schema.literal('.jira'),
    schema.literal('.resilient'),
    schema.literal('.none'),
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
      '.servicenow',
      ServiceNowFieldsSchema,
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
