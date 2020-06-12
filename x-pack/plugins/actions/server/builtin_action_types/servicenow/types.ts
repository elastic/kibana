/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export {
  ExternalIncidentServiceConfiguration as ServiceNowPublicConfigurationType,
  ExternalIncidentServiceSecretConfiguration as ServiceNowSecretConfigurationType,
} from '../case/types';

export interface CreateIncidentRequest {
  summary: string;
  description: string;
}

export type UpdateIncidentRequest = Partial<CreateIncidentRequest>;

export interface CreateCommentRequest {
  [key: string]: string;
}
