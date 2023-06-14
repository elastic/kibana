/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import { initGenAiDashboard } from './create_dashboard';
import {
  GenAiRunActionParamsSchema,
  GenAiRunActionResponseSchema,
  GenAiDashboardActionParamsSchema,
} from '../../../common/gen_ai/schema';
import type {
  GenAiConfig,
  GenAiSecrets,
  GenAiRunActionParams,
  GenAiRunActionResponse,
} from '../../../common/gen_ai/types';
import { OpenAiProviderType, SUB_ACTION } from '../../../common/gen_ai/constants';
import {
  GenAiDashboardActionParams,
  GenAiDashboardActionResponse,
} from '../../../common/gen_ai/types';

export class GenAiConnector extends SubActionConnector<GenAiConfig, GenAiSecrets> {
  private url;
  private provider;
  private key;

  constructor(params: ServiceParams<GenAiConfig, GenAiSecrets>) {
    super(params);

    this.url = this.config.apiUrl;
    this.provider = this.config.apiProvider;
    this.key = this.secrets.apiKey;

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'runApi',
      schema: GenAiRunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'runApi',
      schema: GenAiRunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.DASHBOARD,
      method: 'getDashboard',
      schema: GenAiDashboardActionParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    if (!error.response?.status) {
      return 'Unknown API Error';
    }
    if (error.response.status === 401) {
      return 'Unauthorized API Error';
    }
    return `API Error: ${error.response?.status} - ${error.response?.statusText}`;
  }

  public async runApi({ body }: GenAiRunActionParams): Promise<GenAiRunActionResponse> {
    const response = await this.request({
      url: this.url,
      method: 'post',
      responseSchema: GenAiRunActionResponseSchema,
      data: body,
      headers: {
        ...(this.provider === OpenAiProviderType.OpenAi
          ? { Authorization: `Bearer ${this.key}` }
          : { ['api-key']: this.key }),
        ['content-type']: 'application/json',
      },
    });
    return response.data;
  }

  public async getDashboard({
    dashboardId,
  }: GenAiDashboardActionParams): Promise<GenAiDashboardActionResponse> {
    const privilege = (await this.esClient.transport.request({
      path: '/_security/user/_has_privileges',
      method: 'POST',
      body: {
        index: [
          {
            names: ['.kibana-event-log-*'],
            allow_restricted_indices: true,
            privileges: ['read'],
          },
        ],
      },
    })) as { has_all_requested: boolean };

    if (!privilege?.has_all_requested) {
      return { available: false };
    }

    const response = await initGenAiDashboard({
      logger: this.logger,
      savedObjectsClient: this.savedObjectsClient,
      dashboardId,
    });

    return { available: response.success };
  }
}
