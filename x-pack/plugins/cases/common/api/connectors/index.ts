/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { ActionResult, ActionType } from '@kbn/actions-plugin/common';
import { CasesWebhookFieldsRT } from './cases_webhook';
import { JiraFieldsRT } from './jira';
import { ResilientFieldsRT } from './resilient';
import { ServiceNowITSMFieldsRT } from './servicenow_itsm';
import { ServiceNowSIRFieldsRT } from './servicenow_sir';
import { SwimlaneFieldsRT } from './swimlane';

export * from './cases_webhook';
export * from './jira';
export * from './servicenow_itsm';
export * from './servicenow_sir';
export * from './resilient';
export * from './mappings';
export * from './swimlane';

export type ActionConnector = ActionResult;
export type ActionTypeConnector = ActionType;

export const ConnectorFieldsRt = rt.union([
  CasesWebhookFieldsRT,
  JiraFieldsRT,
  ResilientFieldsRT,
  ServiceNowITSMFieldsRT,
  ServiceNowSIRFieldsRT,
  rt.null,
]);

export enum ConnectorTypes {
  casesWebhook = '.cases-webhook',
  jira = '.jira',
  none = '.none',
  resilient = '.resilient',
  serviceNowITSM = '.servicenow',
  serviceNowSIR = '.servicenow-sir',
  swimlane = '.swimlane',
}

export const connectorTypes = Object.values(ConnectorTypes);

const ConnectorCasesWebhookTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.casesWebhook),
  fields: rt.union([CasesWebhookFieldsRT, rt.null]),
});

const ConnectorJiraTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.jira),
  fields: rt.union([CasesWebhookFieldsRT, rt.null]),
});

const ConnectorResilientTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.resilient),
  fields: rt.union([ResilientFieldsRT, rt.null]),
});

const ConnectorServiceNowITSMTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.serviceNowITSM),
  fields: rt.union([ServiceNowITSMFieldsRT, rt.null]),
});

const ConnectorSwimlaneTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.swimlane),
  fields: rt.union([SwimlaneFieldsRT, rt.null]),
});

const ConnectorServiceNowSIRTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.serviceNowSIR),
  fields: rt.union([ServiceNowSIRFieldsRT, rt.null]),
});

const ConnectorNoneTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.none),
  fields: rt.null,
});

export const NONE_CONNECTOR_ID: string = 'none';

export const ConnectorTypeFieldsRt = rt.union([
  ConnectorCasesWebhookTypeFieldsRt,
  ConnectorJiraTypeFieldsRt,
  ConnectorNoneTypeFieldsRt,
  ConnectorResilientTypeFieldsRt,
  ConnectorServiceNowITSMTypeFieldsRt,
  ConnectorServiceNowSIRTypeFieldsRt,
  ConnectorSwimlaneTypeFieldsRt,
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

// we need to change these types back and forth for storing in ES (arrays overwrite, objects merge)
export type ConnectorFields = rt.TypeOf<typeof ConnectorFieldsRt>;
