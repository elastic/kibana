/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import {
  GenAiRunActionParamsSchema,
  GenAiRunActionResponseSchema,
} from '../../../common/gen_ai/schema';
import type {
  GenAiConfig,
  GenAiSecrets,
  GenAiRunActionParams,
  GenAiRunActionResponse,
} from '../../../common/gen_ai/types';
import { OpenAiProviderType, SUB_ACTION } from '../../../common/gen_ai/constants';

export class GenAiConnector extends SubActionConnector<GenAiConfig, GenAiSecrets> {
  private url;
  private provider;
  private key;

  constructor(params: ServiceParams<GenAiConfig, GenAiSecrets>) {
    super(params);
    console.log('CONFIG???!!!!', this.config);

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
}
