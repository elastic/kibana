/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  JiraFields,
  ResilientFields,
  ServiceNowITSMFields,
  ServiceNowSIRFields,
  SwimlaneFields,
} from './fields';

enum ConnectorTypes {
  casesWebhook = '.cases-webhook',
  jira = '.jira',
  none = '.none',
  resilient = '.resilient',
  serviceNowITSM = '.servicenow',
  serviceNowSIR = '.servicenow-sir',
  swimlane = '.swimlane',
}

export interface ConnectorCasesWebhookTypeFields {
  type: typeof ConnectorTypes.casesWebhook;
  fields: null;
}

export interface ConnectorJiraTypeFields {
  type: typeof ConnectorTypes.jira;
  fields: JiraFields | null;
}

export interface ConnectorResilientTypeFields {
  type: typeof ConnectorTypes.resilient;
  fields: ResilientFields;
}

export interface ConnectorServiceNowITSMTypeFields {
  type: typeof ConnectorTypes.serviceNowITSM;
  fields: ServiceNowITSMFields | null;
}

export interface ConnectorServiceNowSIRTypeFields {
  type: typeof ConnectorTypes.serviceNowSIR;
  fields: ServiceNowSIRFields | null;
}

export interface ConnectorSwimlaneTypeFields {
  type: typeof ConnectorTypes.swimlane;
  fields: SwimlaneFields | null;
}

export interface ConnectorNoneTypeFields {
  type: typeof ConnectorTypes.none;
  fields: null;
}
