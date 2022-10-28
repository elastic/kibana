/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  TinesStoriesActionParamsSchema,
  TinesWebhooksActionParamsSchema,
  TinesRunActionParamsSchema,
} from '../../../../common/connector_types/security/tines/schema';
import type {
  TinesConfig,
  TinesSecrets,
  TinesRunActionParams,
  TinesRunActionResponse,
  TinesStoriesActionResponse,
  TinesWebhooksActionParams,
  TinesWebhooksActionResponse,
  TinesWebhookObject,
} from '../../../../common/connector_types/security/tines/types';
import {
  TinesStoriesApiResponseSchema,
  TinesWebhooksApiResponseSchema,
  TinesRunApiResponseSchema,
} from './api_schema';
import type {
  TinesBaseApiResponse,
  TinesStoriesApiResponse,
  TinesWebhooksApiResponse,
} from './api_schema';
import { SUB_ACTION } from '../../../../common/connector_types/security/tines/constants';

export const API_PATH = '/api/v1';
export const WEBHOOK_PATH = '/webhook';
export const WEBHOOK_AGENT_TYPE = 'Agents::WebhookAgent';

function accumulateStories(acc: TinesStoriesActionResponse, { stories }: TinesStoriesApiResponse) {
  stories.forEach(({ id, name }) => {
    acc.push({ id, name });
  });
}

function accumulateWebhooks(
  acc: TinesWebhooksActionResponse,
  { agents }: TinesWebhooksApiResponse
) {
  agents.forEach(({ id, type, name, story_id: storyId, options: { path = '', secret = '' } }) => {
    if (type === WEBHOOK_AGENT_TYPE) {
      acc.push({ id, name, path, secret, storyId });
    }
  });
}

export class TinesConnector extends SubActionConnector<TinesConfig, TinesSecrets> {
  private urls: {
    stories: string;
    agents: string;
    getRunWebhookURL: (webhook: TinesWebhookObject) => string;
  };

  constructor(params: ServiceParams<TinesConfig, TinesSecrets>) {
    super(params);

    this.urls = {
      stories: `${this.config.url}${API_PATH}/stories`,
      agents: `${this.config.url}${API_PATH}/agents`,
      getRunWebhookURL: (webhook) =>
        `${this.config.url}${WEBHOOK_PATH}/${webhook.path}/${webhook.secret}`,
    };

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.STORIES,
      method: 'getStories',
      schema: TinesStoriesActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.WEBHOOKS,
      method: 'getWebhooks',
      schema: TinesWebhooksActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'runWebhook',
      schema: TinesRunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'runWebhook',
      schema: TinesRunActionParamsSchema,
    });
  }

  private getAuthHeaders() {
    return { 'x-user-email': this.secrets.email, 'x-user-token': this.secrets.token };
  }

  /**
   * Iteratively request pages for a given Tines request, it stops when there's no more pages
   * or when the `pageLimit` is hit. Returns an array of the responses data.
   * @param req The parameters that will be used on every pagination request.
   * @param accumulatePage Function to add each page data into the accumulated result.
   * @param options The pagination options that can be configured. Optional.
   * - `pageLimit` the maximum number of pages the function will request. Optional, defaults to `100`.
   * - `pageSize` the number of results per page. Optional, defaults to `20`.
   * @returns An array of items of the response schema type
   */
  private async paginatedRequest<R extends TinesBaseApiResponse, T>(
    req: SubActionRequestParams<R>,
    accumulatePage: (result: T[], pageData: R) => void,
    { pageLimit = 100, pageSize = 20 }: { pageLimit?: number; pageSize?: number } = {}
  ) {
    if (pageLimit <= 0 || pageSize <= 0) return [];
    let request = { ...req, params: { ...req.params, per_page: pageSize } };

    const result: T[] = [];
    do {
      const pageResponse = await this.request<R>(request);
      const nextPage = pageResponse.data.meta.next_page;
      accumulatePage(result, pageResponse.data);
      request = { ...request, url: nextPage ?? '', params: {} }; // all query params are carried by next_page url
      pageLimit--;
    } while (pageLimit > 0 && request.url);

    return result;
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    if (!error.response?.status) {
      return 'Unknown API Error';
    }
    if (error.response.status === 401) {
      return 'Unauthorized API Error';
    }
    return `API Error: (${error.response?.status}) ${error.response?.statusText}`;
  }

  public async getStories(): Promise<TinesStoriesActionResponse> {
    return this.paginatedRequest(
      {
        url: this.urls.stories,
        headers: this.getAuthHeaders(),
        responseSchema: TinesStoriesApiResponseSchema,
      },
      accumulateStories
    );
  }

  public async getWebhooks({
    storyId,
  }: TinesWebhooksActionParams): Promise<TinesWebhooksActionResponse> {
    return this.paginatedRequest(
      {
        url: this.urls.agents,
        params: { story_id: storyId },
        headers: this.getAuthHeaders(),
        responseSchema: TinesWebhooksApiResponseSchema,
      },
      accumulateWebhooks
    );
  }

  public async runWebhook({
    webhook,
    body,
  }: TinesRunActionParams): Promise<TinesRunActionResponse> {
    const response = await this.request({
      url: this.urls.getRunWebhookURL(webhook),
      method: 'post',
      responseSchema: TinesRunApiResponseSchema,
      data: body,
    });
    return response.data;
  }
}
