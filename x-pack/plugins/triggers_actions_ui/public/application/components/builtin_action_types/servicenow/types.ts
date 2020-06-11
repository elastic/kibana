/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// to remove
import { CaseField, ThirdPartyField, ActionType } from '../../../../../../case/common/api';

import { ActionConnector } from '../../../../types';

export interface ServiceNowActionConnector extends ActionConnector {
  config: ServiceNowConfig;
  secrets: ServiceNowSecrets;
}

export interface ServiceNowActionParams {
  subAction: string;
  subActionParams: {
    savedObjectId: string;
    title: string;
    description: string;
    comments: string;
    externalId: string;
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
}

interface ServiceNowSecrets {
  username: string;
  password: string;
}

// to remove
export interface CasesConfigurationMapping {
  source: CaseField;
  target: ThirdPartyField;
  actionType: ActionType;
}
