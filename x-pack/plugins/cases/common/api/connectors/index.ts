/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import * as rt from 'io-ts';

import type { ActionType } from '@kbn/actions-plugin/common';
/**
 * ActionResult type from the common folder is outdated.
 * The type from server is not exported properly so we
 * disable the linting for the moment
 */

import type { ActionResult } from '@kbn/actions-plugin/server/types';
import { JiraFieldsSchema } from './jira';
import { ResilientFieldsSchema } from './resilient';
import { ServiceNowITSMFieldsSchema } from './servicenow_itsm';
import { ServiceNowSIRFieldsSchema } from './servicenow_sir';
import { SwimlaneFieldsSchema } from './swimlane';

export * from './jira';
export * from './servicenow_itsm';
export * from './servicenow_sir';
export * from './resilient';
export * from './mappings';
export * from './swimlane';

export type ActionConnector = ActionResult;
export type ActionTypeConnector = ActionType;

export enum ConnectorTypes {
  casesWebhook = '.cases-webhook',
  jira = '.jira',
  none = '.none',
  resilient = '.resilient',
  serviceNowITSM = '.servicenow',
  serviceNowSIR = '.servicenow-sir',
  swimlane = '.swimlane',
}

const ConnectorCasesWebhookTypeFieldsSchema = z
  .object({
    type: z.literal(ConnectorTypes.casesWebhook),
    fields: z.null(),
  })
  .strict();

const ConnectorJiraTypeFieldsSchema = z
  .object({
    type: z.literal(ConnectorTypes.jira),
    fields: z.nullable(JiraFieldsSchema),
  })
  .strict();

const ConnectorResilientTypeFieldsSchema = z
  .object({
    type: z.literal(ConnectorTypes.resilient),
    fields: z.nullable(ResilientFieldsSchema),
  })
  .strict();

const ConnectorServiceNowITSMTypeFieldsSchema = z
  .object({
    type: z.literal(ConnectorTypes.serviceNowITSM),
    fields: z.nullable(ServiceNowITSMFieldsSchema),
  })
  .strict();

const ConnectorSwimlaneTypeFieldsSchema = z
  .object({
    type: z.literal(ConnectorTypes.swimlane),
    fields: z.nullable(SwimlaneFieldsSchema),
  })
  .strict();

const ConnectorServiceNowSIRTypeFieldsSchema = z
  .object({
    type: z.literal(ConnectorTypes.serviceNowSIR),
    fields: z.nullable(ServiceNowSIRFieldsSchema),
  })
  .strict();

const ConnectorNoneTypeFieldsSchema = z
  .object({
    type: z.literal(ConnectorTypes.none),
    fields: z.null(),
  })
  .strict();

export const NONE_CONNECTOR_ID: string = 'none';

const ConnectorTypeFieldsSchema = z.discriminatedUnion('type', [
  ConnectorCasesWebhookTypeFieldsSchema,
  ConnectorJiraTypeFieldsSchema,
  ConnectorNoneTypeFieldsSchema,
  ConnectorResilientTypeFieldsSchema,
  ConnectorServiceNowITSMTypeFieldsSchema,
  ConnectorServiceNowSIRTypeFieldsSchema,
  ConnectorSwimlaneTypeFieldsSchema,
]);

export const CaseUserActionConnectorSchema = z.discriminatedUnion('type', [
  ConnectorCasesWebhookTypeFieldsSchema.merge(z.strictObject({ name: z.string() })),
  ConnectorJiraTypeFieldsSchema.merge(z.strictObject({ name: z.string() })),
  ConnectorNoneTypeFieldsSchema.merge(z.strictObject({ name: z.string() })),
  ConnectorResilientTypeFieldsSchema.merge(z.strictObject({ name: z.string() })),
  ConnectorServiceNowITSMTypeFieldsSchema.merge(z.strictObject({ name: z.string() })),
  ConnectorServiceNowSIRTypeFieldsSchema.merge(z.strictObject({ name: z.string() })),
  ConnectorSwimlaneTypeFieldsSchema.merge(z.strictObject({ name: z.string() })),
]);

export const CaseConnectorSchema = z.discriminatedUnion('type', [
  ConnectorCasesWebhookTypeFieldsSchema.merge(z.strictObject({ name: z.string(), id: z.string() })),
  ConnectorJiraTypeFieldsSchema.merge(z.strictObject({ name: z.string(), id: z.string() })),
  ConnectorNoneTypeFieldsSchema.merge(z.strictObject({ name: z.string(), id: z.string() })),
  ConnectorResilientTypeFieldsSchema.merge(z.strictObject({ name: z.string(), id: z.string() })),
  ConnectorServiceNowITSMTypeFieldsSchema.merge(
    z.strictObject({ name: z.string(), id: z.string() })
  ),
  ConnectorServiceNowSIRTypeFieldsSchema.merge(
    z.strictObject({ name: z.string(), id: z.string() })
  ),
  ConnectorSwimlaneTypeFieldsSchema.merge(z.strictObject({ name: z.string(), id: z.string() })),
]);

/**
 * This type represents the connector's format when it is encoded within a user action.
 */
export const CaseUserActionConnectorRt = rt.union([
  rt.intersection([ConnectorCasesWebhookTypeFieldsRt, rt.type({ name: rt.string })]),
  rt.intersection([ConnectorJiraTypeFieldsRt, rt.type({ name: rt.string })]),
  rt.intersection([ConnectorNoneTypeFieldsRt, rt.type({ name: rt.string })]),
  rt.intersection([ConnectorResilientTypeFieldsRt, rt.type({ name: rt.string })]),
  rt.intersection([ConnectorServiceNowITSMTypeFieldsRt, rt.type({ name: rt.string })]),
  rt.intersection([ConnectorServiceNowSIRTypeFieldsRt, rt.type({ name: rt.string })]),
  rt.intersection([ConnectorSwimlaneTypeFieldsRt, rt.type({ name: rt.string })]),
]);

export const CaseConnectorRt = rt.intersection([
  rt.type({
    id: rt.string,
  }),
  CaseUserActionConnectorRt,
]);

export type CaseUserActionConnector = rt.TypeOf<typeof CaseUserActionConnectorRt>;
export type CaseConnector = rt.TypeOf<typeof CaseConnectorRt>;
export type ConnectorTypeFields = rt.TypeOf<typeof ConnectorTypeFieldsRt>;
export type ConnectorCasesWebhookTypeFields = rt.TypeOf<typeof ConnectorCasesWebhookTypeFieldsRt>;
export type ConnectorJiraTypeFields = rt.TypeOf<typeof ConnectorJiraTypeFieldsRt>;
export type ConnectorResilientTypeFields = rt.TypeOf<typeof ConnectorResilientTypeFieldsRt>;
export type ConnectorSwimlaneTypeFields = rt.TypeOf<typeof ConnectorSwimlaneTypeFieldsRt>;
export type ConnectorServiceNowITSMTypeFields = rt.TypeOf<
  typeof ConnectorServiceNowITSMTypeFieldsRt
>;
export type ConnectorServiceNowSIRTypeFields = rt.TypeOf<typeof ConnectorServiceNowSIRTypeFieldsRt>;
