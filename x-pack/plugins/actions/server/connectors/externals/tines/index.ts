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

const BASE_URL = 'https://silent-snow-4890.tines.com/api/v1/';
const STORIES_URL = `${BASE_URL}/stories`;

export class Tines extends BasicConnector<Config, Secrets> {
  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

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
  }

  private getAuthHeaders() {
    return { 'x-user-email': this.secrets.email, 'x-user-token': this.secrets.apiToken };
  }

  public trigger() {}
  public async getStories() {
    const res = await this.request({
      url: STORIES_URL,
      headers: this.getAuthHeaders(),
      responseSchema: StoriesResponseSchema,
    });

    return res.data;
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
