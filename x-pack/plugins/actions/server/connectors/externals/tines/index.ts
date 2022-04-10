/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { HTTPConnectorType, ServiceParams } from '../../../http_framework/types';
import { BasicConnector } from '../../basic';

const ConfigSchema = schema.object({ url: schema.string() });
const SecretsSchema = schema.object({ email: schema.string(), apiToken: schema.string() });
type Config = TypeOf<typeof ConfigSchema>;
type Secrets = TypeOf<typeof SecretsSchema>;

const StoriesResponseSchema = schema.object(
  {
    stories: schema.arrayOf(
      schema.object({ id: schema.number(), name: schema.string() }, { unknowns: 'ignore' })
    ),
  },
  { unknowns: 'ignore' }
);

const WebhookResponseSchema = schema.object(
  {
    agents: schema.arrayOf(
      schema.object(
        { id: schema.number(), type: schema.string(), story_id: schema.number() },
        { unknowns: 'ignore' }
      )
    ),
  },
  { unknowns: 'ignore' }
);

const BASE_URL = '/api/v1';

export class Tines extends BasicConnector<Config, Secrets> {
  private urls: {
    basic: string;
    base: string;
    stories: string;
    agents: string;
    getRunURL: (actionId: number) => string;
  };

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.urls = {
      basic: this.config.url,
      base: `${this.config.url}${BASE_URL}`,
      stories: `${this.config.url}${BASE_URL}/stories`,
      agents: `${this.config.url}${BASE_URL}/agents`,
      getRunURL: (actionId: number) => `${this.config.url}${BASE_URL}/agents/${actionId}/run`,
    };

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: 'trigger',
      method: 'trigger',
      schema: schema.object({}, { unknowns: 'allow' }),
    });

    this.registerSubAction({
      name: 'stories',
      method: 'getStories',
      schema: null,
    });

    this.registerSubAction({
      name: 'webhooks',
      method: 'getWebhooks',
      schema: schema.object({ storyId: schema.number() }),
    });

    this.registerSubAction({
      name: 'run',
      method: 'runWebhook',
      schema: schema.object({ actionId: schema.number() }),
    });
  }

  private getAuthHeaders() {
    return { 'x-user-email': this.secrets.email, 'x-user-token': this.secrets.apiToken };
  }

  public async runWebhook({ actionId }: { actionId: number }) {
    const res = await this.request({
      url: this.urls.getRunURL(actionId),
      method: 'post',
      headers: this.getAuthHeaders(),
      responseSchema: WebhookResponseSchema,
    });

    return res.data;
  }

  public async getWebhooks({ storyId }: { storyId: number }) {
    const res = await this.request({
      url: this.urls.agents,
      headers: this.getAuthHeaders(),
      responseSchema: WebhookResponseSchema,
    });

    return res.data.agents.filter(
      (agent) => agent.type === 'Agents::WebhookAgent' && agent.story_id === storyId
    );
  }

  public async getStories() {
    const res = await this.request({
      url: this.urls.stories,
      headers: this.getAuthHeaders(),
      responseSchema: StoriesResponseSchema,
    });

    return res.data.stories;
  }
}

export const TinesConnector: HTTPConnectorType<Config, Secrets> = {
  id: '.tines',
  name: 'Tines',
  minimumLicenseRequired: 'basic',
  schema: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  Service: Tines,
};
