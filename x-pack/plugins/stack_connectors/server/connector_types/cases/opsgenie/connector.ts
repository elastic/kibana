/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { AxiosError } from 'axios';
import { CloseAlertParamsSchema, CreateAlertParamsSchema, Response } from './schema';
import { CloseAlertParams, Config, CreateAlertParams, Secrets } from './types';

// TODO: figure out the right schema for this
interface ErrorSchema {
  errors?: {
    message?: string;
  };
}

export class OpsgenieConnector extends SubActionConnector<Config, Secrets> {
  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.registerSubAction({
      method: this.createAlert.name,
      name: 'createAlert',
      schema: CreateAlertParamsSchema,
    });

    this.registerSubAction({
      method: this.closeAlert.name,
      name: 'closeAlert',
      schema: CloseAlertParamsSchema,
    });
  }

  public getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Message: ${error.response?.data.errors?.message ?? 'unknown error'}.`;
  }

  public async createAlert(params: CreateAlertParams) {
    return this.request({
      method: 'post',
      url: this.config.apiUrl,
      data: params,
      headers: this.createHeaders(),
      responseSchema: Response,
    });
  }

  private createHeaders() {
    return { Authorization: `GenieKey ${this.secrets.apiKey}` };
  }

  public async closeAlert(params: CloseAlertParams) {
    return this.request({
      method: 'post',
      url: this.concatPathToURL('close'),
      data: params,
      headers: this.createHeaders(),
      responseSchema: Response,
    });
  }

  private concatPathToURL(path: string) {
    const fullURL = new URL(path, this.config.apiUrl);

    return fullURL.toString();
  }
}
