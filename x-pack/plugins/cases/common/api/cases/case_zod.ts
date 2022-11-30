/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

const CaseStatus = z.enum(['open', 'in-progress', 'closed']);

const JiraFields = z
  .object({
    issueType: z.nullable(z.string()),
    priority: z.nullable(z.string()),
    parent: z.nullable(z.string()),
  })
  .strict();

const ResilientFields = z
  .object({
    incidentTypes: z.nullable(z.array(z.string())),
    severityCode: z.nullable(z.string()),
  })
  .strict();

const ServiceNowITSMFields = z
  .object({
    impact: z.nullable(z.string()),
    severity: z.nullable(z.string()),
    urgency: z.nullable(z.string()),
    category: z.nullable(z.string()),
    subcategory: z.nullable(z.string()),
  })
  .strict();

const SwimlaneFields = z
  .object({
    caseId: z.nullable(z.string()),
  })
  .strict();

const ServiceNowSIRFields = z
  .object({
    category: z.nullable(z.string()),
    destIp: z.nullable(z.boolean()),
    malwareHash: z.nullable(z.boolean()),
    malwareUrl: z.nullable(z.boolean()),
    priority: z.nullable(z.string()),
    sourceIp: z.nullable(z.boolean()),
    subcategory: z.nullable(z.string()),
  })
  .strict();

const ConnectorCasesWebhookTypeFields = z
  .object({
    name: z.string(),
    id: z.string(),
    type: z.literal('.cases-webhook'),
    fields: z.null(),
  })
  .strict();

const ConnectorJiraTypeFields = z
  .object({
    name: z.string(),
    id: z.string(),
    type: z.literal('.jira'),
    fields: z.nullable(JiraFields),
  })
  .strict();

const ConnectorResilientTypeFields = z
  .object({
    name: z.string(),
    id: z.string(),
    type: z.literal('.resilient'),
    fields: z.nullable(ResilientFields),
  })
  .strict();

const ConnectorServiceNowITSMTypeFields = z
  .object({
    name: z.string(),
    id: z.string(),
    type: z.literal('.servicenow'),
    fields: z.nullable(ServiceNowITSMFields),
  })
  .strict();

const ConnectorServiceNowSIRTypeFields = z
  .object({
    name: z.string(),
    id: z.string(),
    type: z.literal('.servicenow-sir'),
    fields: z.nullable(ServiceNowSIRFields),
  })
  .strict();

const ConnectorSwimlaneTypeFields = z
  .object({
    name: z.string(),
    id: z.string(),
    type: z.literal('.swimlane'),
    fields: z.nullable(SwimlaneFields),
  })
  .strict();

const ConnectorNoneTypeFields = z
  .object({
    name: z.string(),
    id: z.string(),
    type: z.literal('.none'),
    fields: z.null(),
  })
  .strict();

const CaseConnector = z.discriminatedUnion('type', [
  ConnectorCasesWebhookTypeFields,
  ConnectorJiraTypeFields,
  ConnectorNoneTypeFields,
  ConnectorResilientTypeFields,
  ConnectorServiceNowITSMTypeFields,
  ConnectorServiceNowSIRTypeFields,
  ConnectorSwimlaneTypeFields,
]);

// const CaseConnector = z.intersection(
//   ConnectorTypeFields,
//   z.object({ name: z.string(), id: z.string() }).strict()
// );

// const CaseConnector = z
//   .object({ name: z.string(), id: z.string() })
//   .strict()
//   .merge(ConnectorTypeFields);

const CaseSeverity = z.enum(['low', 'medium', 'high', 'critical']);

const CaseBasic = z
  .object({
    description: z.string(),
    status: CaseStatus,
    tags: z.array(z.string()),
    title: z.string(),
    connector: CaseConnector,
    settings: z.object({ syncAlerts: z.boolean() }),
    owner: z.string(),
    severity: CaseSeverity,
    assignees: z.array(z.object({ uid: z.string() })),
  })
  .strict();

// const CasePatchRequest = z.intersection(
//   z.optional(CaseBasic),
//   z.object({ id: z.string(), version: z.string() }).strict()
// );

const CasePatchRequest = z
  .object({ id: z.string(), version: z.string() })
  .strict()
  .merge(CaseBasic.deepPartial());

export const CasesPatchRequest = z.object({ cases: z.array(CasePatchRequest) }).strict();
