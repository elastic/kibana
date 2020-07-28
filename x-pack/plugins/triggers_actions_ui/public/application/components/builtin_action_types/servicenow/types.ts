/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ServiceNowActionConnector {
  config: ServiceNowConfig;
  secrets: ServiceNowSecrets;
}

export interface ServiceNowActionParams {
  subAction: string;
  subActionParams: {
    savedObjectId: string;
    title: string;
    description: string;
    comment: string;
    externalId: string | null;
    severity: string;
    urgency: string;
    impact: string;
  };
}

interface IncidentConfiguration {
  mapping: CasesConfigurationMapping[];
}

interface ServiceNowConfig {
  apiUrl: string;
  incidentConfiguration?: IncidentConfiguration;
  isCaseOwned?: boolean;
}

interface ServiceNowSecrets {
  username: string;
  password: string;
}

// to remove
export interface CasesConfigurationMapping {
  source: string;
  target: string;
  actionType: string;
}
