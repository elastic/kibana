/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { AxiosError } from 'axios';
import { BasicConnector } from './basic';
import { ServiceParams } from './types';

const ConfigSchema = schema.object({ url: schema.string() });
const SecretsSchema = schema.object({ username: schema.string(), password: schema.string() });
type Config = TypeOf<typeof ConfigSchema>;
type Secrets = TypeOf<typeof SecretsSchema>;

interface ErrorSchema {
  errorMessage: string;
  errorCode: number;
}

export class TestBasicConnector extends BasicConnector<Config, Secrets> {
  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);
    this.registerSubAction({
      name: 'testUrl',
      method: 'testUrl',
      schema: schema.object({ url: schema.string() }),
    });
  }

  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Message: ${error.response?.data.errorMessage}. Code: ${error.response?.data.errorCode}`;
  }

  public async testUrl({ url, data = {} }: { url: string; data?: Record<string, unknown> | null }) {
    const res = await this.request({
      url,
      data,
      headers: { 'X-Test-Header': 'test' },
      responseSchema: schema.object({ status: schema.string() }),
    });

    return res;
  }
}
