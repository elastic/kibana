/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import type { ActionType as ConnectorActionType } from '@kbn/actions-plugin/common';
import type { ActionResult } from '@kbn/actions-plugin/server/types';

export type ActionConnector = ActionResult;
export type ActionTypeConnector = ConnectorActionType;

export enum ConnectorTypes {
  casesWebhook = '.cases-webhook',
  jira = '.jira',
  none = '.none',
  resilient = '.resilient',
  serviceNowITSM = '.servicenow',
  serviceNowSIR = '.servicenow-sir',
  swimlane = '.swimlane',
  theHive = '.thehive',
}

const ConnectorCasesWebhookTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.casesWebhook),
  fields: rt.null,
});

/**
 * Jira
 */

export const JiraFieldsRt = rt.strict({
  issueType: rt.union([rt.string, rt.null]),
  priority: rt.union([rt.string, rt.null]),
  parent: rt.union([rt.string, rt.null]),
});

export type JiraFieldsType = rt.TypeOf<typeof JiraFieldsRt>;

const ConnectorJiraTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.jira),
  fields: rt.union([JiraFieldsRt, rt.null]),
});

/**
 * Resilient
 */

export const ResilientFieldsRt = rt.strict({
  incidentTypes: rt.union([rt.array(rt.string), rt.null]),
  severityCode: rt.union([rt.string, rt.null]),
});

export type ResilientFieldsType = rt.TypeOf<typeof ResilientFieldsRt>;

const ConnectorResilientTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.resilient),
  fields: rt.union([ResilientFieldsRt, rt.null]),
});

/**
 * ServiceNow
 */

export const ServiceNowITSMFieldsRt = rt.strict({
  impact: rt.union([rt.string, rt.null]),
  severity: rt.union([rt.string, rt.null]),
  urgency: rt.union([rt.string, rt.null]),
  category: rt.union([rt.string, rt.null]),
  subcategory: rt.union([rt.string, rt.null]),
});

export type ServiceNowITSMFieldsType = rt.TypeOf<typeof ServiceNowITSMFieldsRt>;

const ConnectorServiceNowITSMTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.serviceNowITSM),
  fields: rt.union([ServiceNowITSMFieldsRt, rt.null]),
});

export const ServiceNowSIRFieldsRt = rt.intersection([
  rt.strict({
    category: rt.union([rt.string, rt.null]),
    destIp: rt.union([rt.boolean, rt.null]),
    malwareHash: rt.union([rt.boolean, rt.null]),
    malwareUrl: rt.union([rt.boolean, rt.null]),
    priority: rt.union([rt.string, rt.null]),
    sourceIp: rt.union([rt.boolean, rt.null]),
    subcategory: rt.union([rt.string, rt.null]),
  }),
  rt.exact(
    rt.partial({
      additionalFields: rt.union([rt.string, rt.null]),
    })
  ),
]);

export type ServiceNowSIRFieldsType = rt.TypeOf<typeof ServiceNowSIRFieldsRt>;

const ConnectorServiceNowSIRTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.serviceNowSIR),
  fields: rt.union([ServiceNowSIRFieldsRt, rt.null]),
});

/**
 * Swimlane
 */

export const SwimlaneFieldsRt = rt.strict({
  caseId: rt.union([rt.string, rt.null]),
});

export enum SwimlaneConnectorType {
  All = 'all',
  Alerts = 'alerts',
  Cases = 'cases',
}

export type SwimlaneFieldsType = rt.TypeOf<typeof SwimlaneFieldsRt>;

const ConnectorSwimlaneTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.swimlane),
  fields: rt.union([SwimlaneFieldsRt, rt.null]),
});

/**
 * Thehive
 */

export const TheHiveFieldsRt = rt.strict({
  tlp: rt.union([rt.number, rt.null]),
});

export type TheHiveFieldsType = rt.TypeOf<typeof TheHiveFieldsRt>;

const ConnectorTheHiveTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.theHive),
  fields: rt.union([TheHiveFieldsRt, rt.null]),
});

/**
 * None connector
 */

const ConnectorNoneTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.none),
  fields: rt.null,
});

export const ConnectorTypeFieldsRt = rt.union([
  ConnectorCasesWebhookTypeFieldsRt,
  ConnectorJiraTypeFieldsRt,
  ConnectorNoneTypeFieldsRt,
  ConnectorResilientTypeFieldsRt,
  ConnectorServiceNowITSMTypeFieldsRt,
  ConnectorServiceNowSIRTypeFieldsRt,
  ConnectorSwimlaneTypeFieldsRt,
  ConnectorTheHiveTypeFieldsRt,
]);

/**
 * This type represents the connector's format when it is encoded within a user action.
 */
export const CaseUserActionConnectorRt = rt.union([
  rt.intersection([ConnectorCasesWebhookTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorJiraTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorNoneTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorResilientTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorServiceNowITSMTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorServiceNowSIRTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorSwimlaneTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorTheHiveTypeFieldsRt, rt.strict({ name: rt.string })]),
]);

export const CaseConnectorRt = rt.intersection([
  rt.strict({
    id: rt.string,
  }),
  CaseUserActionConnectorRt,
]);

/**
 * Mappings
 */

const ConnectorMappingActionTypeRt = rt.union([
  rt.literal('append'),
  rt.literal('nothing'),
  rt.literal('overwrite'),
]);

const ConnectorMappingSourceRt = rt.union([
  rt.literal('title'),
  rt.literal('description'),
  rt.literal('comments'),
  rt.literal('tags'),
]);

const ConnectorMappingTargetRt = rt.union([rt.string, rt.literal('not_mapped')]);

const ConnectorMappingRt = rt.strict({
  action_type: ConnectorMappingActionTypeRt,
  source: ConnectorMappingSourceRt,
  target: ConnectorMappingTargetRt,
});

export const ConnectorMappingsRt = rt.array(ConnectorMappingRt);

export const ConnectorMappingsAttributesRt = rt.strict({
  mappings: ConnectorMappingsRt,
  owner: rt.string,
});

export type ConnectorMappingsAttributes = rt.TypeOf<typeof ConnectorMappingsAttributesRt>;
export type ConnectorMappings = rt.TypeOf<typeof ConnectorMappingsRt>;
export type ConnectorMappingActionType = rt.TypeOf<typeof ConnectorMappingActionTypeRt>;
export type ConnectorMappingSource = rt.TypeOf<typeof ConnectorMappingSourceRt>;
export type ConnectorMappingTarget = rt.TypeOf<typeof ConnectorMappingTargetRt>;
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
export type ConnectorTheHiveTypeFields = rt.TypeOf<typeof ConnectorTheHiveTypeFieldsRt>;
