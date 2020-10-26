/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

// Reserved for future implementation
export const CaseConfigurationSchema = schema.object({});

const CommentProps = {
  comment: schema.string(),
  type: schema.nullable(schema.string()),
};

const CaseBasicProps = {
  description: schema.string(),
  title: schema.string(),
  tags: schema.arrayOf(schema.string()),
};

const CaseUpdateRequestProps = {
  id: schema.string(),
  version: schema.string(),
  description: schema.nullable(CaseBasicProps.description),
  title: schema.nullable(CaseBasicProps.title),
  tags: schema.nullable(CaseBasicProps.tags),
  status: schema.nullable(schema.string()),
};

const CaseAddCommentRequestProps = {
  caseId: schema.string(),
  comment: schema.object(CommentProps),
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
