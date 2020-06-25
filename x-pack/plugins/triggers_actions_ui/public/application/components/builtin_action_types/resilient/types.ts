/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// to remove
import { CaseField, ThirdPartyField, ActionType } from '../../../../../../case/common/api';

import { ActionConnector } from '../../../../types';

export interface ResilientActionConnector extends ActionConnector {
  config: ResilientConfig;
  secrets: ResilientSecrets;
}

export interface ResilientActionParams {
  subAction: string;
  subActionParams: {
    savedObjectId: string;
    title: string;
    description: string;
    comment: string;
    externalId: string | null;
  };
}

interface IncidentConfiguration {
  mapping: CasesConfigurationMapping[];
}

interface ResilientConfig {
  apiUrl: string;
  orgId: string;
  incidentConfiguration?: IncidentConfiguration;
}

interface ResilientSecrets {
  apiKeyId: string;
  apiKeySecret: string;
}

// to remove
export interface CasesConfigurationMapping {
  source: CaseField;
  target: ThirdPartyField;
  actionType: ActionType;
}
