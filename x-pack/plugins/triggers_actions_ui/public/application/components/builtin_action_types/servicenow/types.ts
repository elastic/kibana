/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionConnector } from '../../../../types';

export interface ServiceNowActionConnector extends ActionConnector {
  config: ServiceNowConfig;
  secrets: ServiceNowSecrets;
}

export interface ServiceNowActionParams {
  // subAction: string;
  // subActionParams: {
  savedObjectId: string;
  title: string;
  description: string;
  comments: string;
  externalId: string;
  severity: string;
  urgency: string;
  impact: string;
  // };
}

interface ServiceNowConfig {
  apiUrl: string;
  incidentConfiguration: Record<string, string>;
}

interface ServiceNowSecrets {
  username: string;
  password: string;
}
