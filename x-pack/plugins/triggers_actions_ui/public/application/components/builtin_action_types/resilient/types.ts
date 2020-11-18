/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UserConfiguredActionConnector } from '../../../../types';

export type ResilientActionConnector = UserConfiguredActionConnector<
  ResilientConfig,
  ResilientSecrets
>;

export interface ResilientActionParams {
  subAction: string;
  subActionParams: {
    savedObjectId: string;
    title: string;
    description: string;
    externalId: string | null;
    incidentTypes: number[];
    severityCode: number;
    comments: Array<{ commentId: string; comment: string }>;
  };
}

export interface ResilientConfig {
  apiUrl: string;
  orgId: string;
}

export interface ResilientSecrets {
  apiKeyId: string;
  apiKeySecret: string;
}
