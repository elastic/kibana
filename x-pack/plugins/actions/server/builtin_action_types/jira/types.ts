/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { JiraPublicConfigurationSchema, JiraSecretConfigurationSchema } from './schema';

export type JiraPublicConfigurationType = TypeOf<typeof JiraPublicConfigurationSchema>;
export type JiraSecretConfigurationType = TypeOf<typeof JiraSecretConfigurationSchema>;

interface CreateIncidentBasicRequestArgs {
  summary: string;
  description: string;
}
interface CreateIncidentRequestArgs extends CreateIncidentBasicRequestArgs {
  project: { key: string };
  issuetype: { name: string };
}

export interface CreateIncidentRequest {
  fields: CreateIncidentRequestArgs;
}

export interface UpdateIncidentRequest {
  fields: Partial<CreateIncidentBasicRequestArgs>;
}

export interface CreateCommentRequest {
  body: string;
}
