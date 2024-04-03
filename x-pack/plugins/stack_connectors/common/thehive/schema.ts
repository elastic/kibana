/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { TheHiveSeverity, TheHiveTLP, SUB_ACTION } from './constants';

export const TheHiveConfigSchema = schema.object({
  url: schema.string(),
  organisation: schema.nullable(schema.string()),
});

export const TheHiveSecretsSchema = schema.object({
  api_key: schema.string()
});

export const ExecutorSubActionPushParamsSchema = schema.object({
  incident: schema.object({
    title: schema.string(),
    description: schema.string(),
    externalId: schema.nullable(schema.string()),
    severity: schema.nullable(schema.number({ defaultValue: TheHiveSeverity.MEDIUM })),
    tlp: schema.nullable(schema.number({ defaultValue: TheHiveTLP.AMBER })),
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

export const ExecutorSubActionGetIncidentParamsSchema = schema.object({
  externalId: schema.string(),
});

export const ExecutorSubActionCreateAlertParamsSchema = schema.object({
  title: schema.string(),
  description: schema.string(),
  type: schema.string(),
  source: schema.string(),
  sourceRef: schema.string(),
  severity: schema.nullable(schema.number({ defaultValue: TheHiveSeverity.MEDIUM })),
  tlp: schema.nullable(schema.number({ defaultValue: TheHiveTLP.AMBER })),
  tags: schema.nullable(schema.arrayOf(schema.string())),
});

export const ExecutorParamsSchema = schema.oneOf([
  schema.object({
    subAction: schema.literal(SUB_ACTION.PUSH_TO_SERVICE),
    subActionParams: ExecutorSubActionPushParamsSchema,
  }),
  schema.object({
    subAction: schema.literal(SUB_ACTION.CREATE_ALERT),
    subActionParams: ExecutorSubActionCreateAlertParamsSchema,
  }),
]);


export const TheHiveIncidentResponseSchema = schema.object(
  {
    _id: schema.string(),
    _type: schema.string(),
    _createdBy: schema.string(),
    _updatedBy: schema.nullable(schema.string()),
    _createdAt: schema.number(),
    _updatedAt: schema.nullable(schema.number()),
    number: schema.number(),
    title: schema.string(),
    description: schema.string(),
    severity: schema.number(),
    severityLabel: schema.string(),
    startDate: schema.number(),
    endDate: schema.nullable(schema.number()),
    tags: schema.nullable(schema.arrayOf(schema.string())),
    flag: schema.boolean(),
    tlp: schema.number(),
    tlpLabel: schema.string(),
    pap: schema.number(),
    papLabel: schema.string(),
    status: schema.string(),
    stage: schema.string(),
    summary: schema.nullable(schema.string()),
    impactStatus: schema.nullable(schema.string()),
    assignee: schema.nullable(schema.string()),
    customFields: schema.nullable(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
    userPermissions: schema.nullable(schema.arrayOf(schema.string())),
    extraData: schema.object({}, { unknowns: 'allow' }),
    newDate: schema.number(),
    inProgressDate: schema.nullable(schema.number()),
    closedDate: schema.nullable(schema.number()),
    alertDate: schema.nullable(schema.number()),
    alertNewDate: schema.nullable(schema.number()),
    alertInProgressDate: schema.nullable(schema.number()),
    alertImportedDate: schema.nullable(schema.number()),
    timeToDetect: schema.number(),
    timeToTriage: schema.nullable(schema.number()),
    timeToQualify: schema.nullable(schema.number()),
    timeToAcknowledge: schema.nullable(schema.number()),
    timeToResolve: schema.nullable(schema.number()),
    handlingDuration: schema.nullable(schema.number()),
  },
  { unknowns: 'ignore' }
);

export const TheHiveAddCommentResponseSchema = schema.object(
  {
    _id: schema.string(),
    _type: schema.string(),
    createdBy: schema.string(),
    createdAt: schema.number(),
    updatedAt: schema.nullable(schema.number()),
    updatedBy: schema.nullable(schema.string()),
    message: schema.string(),
    isEdited: schema.boolean(),
    extraData: schema.object({}, { unknowns: 'allow' }),
  },
  { unknowns: 'ignore' }
);

export const TheHiveCreateAlertResponseSchema = schema.object(
  {
    _id: schema.string(),
    _type: schema.string(),
    _createdBy: schema.string(),
    _updatedBy: schema.nullable(schema.string()),
    _createdAt: schema.number(),
    _updatedAt: schema.nullable(schema.number()),
    type: schema.string(),
    source: schema.string(),
    sourceRef: schema.string(),
    externalLink: schema.nullable(schema.string()),
    title: schema.string(),
    description: schema.string(),
    severity: schema.number(),
    severityLabel: schema.string(),
    date: schema.number(),
    tags: schema.nullable(schema.arrayOf(schema.string())),
    tlp: schema.number(),
    tlpLabel: schema.string(),
    pap: schema.number(),
    papLabel: schema.string(),
    follow: schema.nullable(schema.boolean()),
    customFields: schema.nullable(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
    caseTemplate: schema.nullable(schema.string()),
    observableCount: schema.number(),
    caseId: schema.nullable(schema.string()),
    status: schema.string(),
    stage: schema.string(),
    assignee: schema.nullable(schema.string()),
    summary: schema.nullable(schema.string()),
    extraData: schema.object({}, { unknowns: 'allow' }),
    newDate: schema.number(),
    inProgressDate: schema.nullable(schema.number()),
    closedDate: schema.nullable(schema.number()),
    importedDate: schema.nullable(schema.number()),
    timeToDetect: schema.number(),
    timeToTriage: schema.nullable(schema.number()),
    timeToQualify: schema.nullable(schema.number()),
    timeToAcknowledge: schema.nullable(schema.number()),
  },
  { unknowns: 'ignore' }
);

export const TheHiveFailureResponseSchema = schema.object(
  {
    type: schema.number(),
    message: schema.string(),
  },
  { unknowns: 'allow' }
);
