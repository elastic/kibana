/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  GetIntegrationResponse,
  ListIntegrationsResponse,
  CreateIntegrationPayload,
  CreateIntegrationResponse,
  UpdateIntegrationResponse,
  UpdateIntegrationPayload,
} from '../../../common/http_api/integrations';

export class IntegrationService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list() {
    const response = await this.http.get<ListIntegrationsResponse>('/internal/workchat/tools');
    return response.integrations;
  }

  async get(integrationId: string) {
    return await this.http.get<GetIntegrationResponse>(`/internal/workchat/tools/${integrationId}`);
  }

  async create(request: CreateIntegrationPayload) {
    return await this.http.post<CreateIntegrationResponse>(`/internal/workchat/tools`, {
      body: JSON.stringify(request),
    });
  }

  async update(id: string, request: UpdateIntegrationPayload) {
    return await this.http.put<UpdateIntegrationResponse>(`/internal/workchat/tools/${id}`, {
      body: JSON.stringify(request),
    });
  }

  async delete(integrationId: string) {
    return await this.http.delete(`/internal/workchat/tools/${integrationId}`);
  }
}
