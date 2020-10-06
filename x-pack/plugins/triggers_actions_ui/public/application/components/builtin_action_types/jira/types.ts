/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CasesConfigurationMapping } from '../case_mappings';
import { UserConfiguredActionConnector } from '../../../../types';

export type JiraActionConnector = UserConfiguredActionConnector<JiraConfig, JiraSecrets>;

export interface JiraActionParams {
  subAction: string;
  subActionParams: {
    savedObjectId: string;
    title: string;
    description: string;
    comments: Array<{ commentId: string; comment: string }>;
    externalId: string | null;
    issueType: string;
    priority: string;
    labels: string[];
    parent: string | null;
  };
}

interface IncidentConfiguration {
  mapping: CasesConfigurationMapping[];
}

export interface JiraConfig {
  apiUrl: string;
  projectKey: string;
  incidentConfiguration?: IncidentConfiguration;
  isCaseOwned?: boolean;
}

export interface JiraSecrets {
  email: string;
  apiToken: string;
}

// to remove
