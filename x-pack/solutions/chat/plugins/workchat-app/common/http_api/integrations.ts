/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationConfiguration } from '@kbn/wci-common';
import type { Integration } from '../integrations';

export type IntegrationType = string;

export interface ListIntegrationsResponse {
  integrations: Integration[];
}

export interface CreateIntegrationPayload {
  type: IntegrationType;
  name: string;
  description: string;
  configuration: IntegrationConfiguration;
}

export type CreateIntegrationResponse = Integration;

export interface UpdateIntegrationPayload {
  name?: string;
  description?: string;
  configuration?: IntegrationConfiguration;
}

export type UpdateIntegrationResponse = Integration;

export type GetIntegrationResponse = Integration;

export interface DeleteIntegrationResponse {
  success: boolean;
}
