/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { ActionResult, ActionType } from '../../../../actions/common';
import { JiraFieldsRT } from './jira';
import { ResilientFieldsRT } from './resilient';
import { ServiceNowITSMFieldsRT } from './servicenow_itsm';
import { ServiceNowSIRFieldsRT } from './servicenow_sir';

export * from './jira';
export * from './servicenow_itsm';
export * from './servicenow_sir';
export * from './resilient';
export * from './mappings';

export type ActionConnector = ActionResult;
export type ActionTypeConnector = ActionType;

export const ConnectorFieldsRt = rt.union([
  JiraFieldsRT,
  ResilientFieldsRT,
  ServiceNowITSMFieldsRT,
  ServiceNowSIRFieldsRT,
  rt.null,
]);

export enum ConnectorTypes {
  jira = '.jira',
  resilient = '.resilient',
  serviceNowITSM = '.servicenow',
  serviceNowSIR = '.servicenow-sir',
  none = '.none',
}

export const connectorTypes = Object.values(ConnectorTypes);

const ConnectorJiraTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.jira),
  fields: rt.union([JiraFieldsRT, rt.null]),
});

const ConnectorResillientTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.resilient),
  fields: rt.union([ResilientFieldsRT, rt.null]),
});

const ConnectorServiceNowITSMTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.serviceNowITSM),
  fields: rt.union([ServiceNowITSMFieldsRT, rt.null]),
});

const ConnectorServiceNowSIRTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.serviceNowSIR),
  fields: rt.union([ServiceNowSIRFieldsRT, rt.null]),
});

const ConnectorNoneTypeFieldsRt = rt.type({
  type: rt.literal(ConnectorTypes.none),
  fields: rt.null,
});

export const ConnectorTypeFieldsRt = rt.union([
  ConnectorJiraTypeFieldsRt,
  ConnectorResillientTypeFieldsRt,
  ConnectorServiceNowITSMTypeFieldsRt,
  ConnectorServiceNowSIRTypeFieldsRt,
  ConnectorNoneTypeFieldsRt,
]);

export const CaseConnectorRt = rt.intersection([
  rt.type({
    id: rt.string,
    name: rt.string,
  }),
  ConnectorTypeFieldsRt,
]);

export type CaseConnector = rt.TypeOf<typeof CaseConnectorRt>;
export type ConnectorTypeFields = rt.TypeOf<typeof ConnectorTypeFieldsRt>;
export type ConnectorJiraTypeFields = rt.TypeOf<typeof ConnectorJiraTypeFieldsRt>;
export type ConnectorResillientTypeFields = rt.TypeOf<typeof ConnectorResillientTypeFieldsRt>;
export type ConnectorServiceNowITSMTypeFields = rt.TypeOf<
  typeof ConnectorServiceNowITSMTypeFieldsRt
>;
export type ConnectorServiceNowSIRTypeFields = rt.TypeOf<typeof ConnectorServiceNowSIRTypeFieldsRt>;

// we need to change these types back and forth for storing in ES (arrays overwrite, objects merge)
export type ConnectorFields = rt.TypeOf<typeof ConnectorFieldsRt>;

export type ESConnectorFields = Array<{
  key: string;
  value: unknown;
}>;

export type ESCaseConnectorTypes = ConnectorTypes;
export interface ESCaseConnector {
  id: string;
  name: string;
  type: ESCaseConnectorTypes;
  fields: ESConnectorFields | null;
}
