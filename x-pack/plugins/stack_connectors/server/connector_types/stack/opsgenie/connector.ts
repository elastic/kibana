/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { AxiosError } from 'axios';
import { CloseAlertParamsSchema, CreateAlertParamsSchema, Response } from './schema';
import { CloseAlertParams, Config, CreateAlertParams, Secrets } from './types';

interface ErrorSchema {
  message?: string;
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
    return `Message: ${
      error.response?.data.errors?.message ?? error.response?.data.message ?? 'unknown error'
    }.`;
  }

  public async createAlert(params: CreateAlertParams) {
    const res = await this.request({
      method: 'post',
      url: this.concatPathToURL('v2/alerts'),
      data: { ...params, alias: OpsgenieConnector.createAlias(params.alias) },
      headers: this.createHeaders(),
      responseSchema: Response,
    });

    return res.data;
  }

  private static createAlias(alias?: string) {
    // opsgenie v2 requires that the alias length be no more than 512 characters
    // see their docs for more details https://docs.opsgenie.com/docs/alert-api#create-alert
    if (!alias || alias.length <= 512) {
      return alias;
    }

    // To give preference to avoiding collisions we're using sha256 over of md5 but we are compromising on speed a bit here
    const hasher = crypto.createHash('sha256');
    const sha256Hash = hasher.update(alias);

    return sha256Hash.digest('hex');
  }

  private createHeaders() {
    return { Authorization: `GenieKey ${this.secrets.apiKey}`, 'Content-Type': 'application/json' };
  }

  public async closeAlert(params: CloseAlertParams) {
    const fullURL = new URL(`v2/alerts/${params.alias}/close`, this.config.apiUrl);
    fullURL.searchParams.set('identifierType', 'alias');

    const res = await this.request({
      method: 'post',
      url: fullURL.toString(),
      data: params,
      headers: this.createHeaders(),
      responseSchema: Response,
    });

    return res.data;
  }

  private concatPathToURL(path: string) {
    const fullURL = new URL(path, this.config.apiUrl);

    return fullURL.toString();
  }
}
