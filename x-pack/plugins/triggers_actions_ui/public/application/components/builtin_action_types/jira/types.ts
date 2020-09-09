/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CasesConfigurationMapping } from '../case_mappings';

export interface JiraActionConnector {
  config: JiraConfig;
  secrets: JiraSecrets;
}

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
  };
}

interface IncidentConfiguration {
  mapping: CasesConfigurationMapping[];
}

interface JiraConfig {
  apiUrl: string;
  projectKey: string;
  incidentConfiguration?: IncidentConfiguration;
  isCaseOwned?: boolean;
}

interface JiraSecrets {
  email: string;
  apiToken: string;
}

// to remove
