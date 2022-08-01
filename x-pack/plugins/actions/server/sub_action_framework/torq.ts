/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AxiosError } from 'axios';

import { SubActionConnector } from '../sub_action_framework/sub_action_connector';
import { ServiceParams } from '../sub_action_framework/types';

export const TorqConfigSchema = schema.object({ url: schema.string() });
export const TorqSecretsSchema = schema.object({
  username: schema.string(),
  password: schema.string(),
});
export type TorqConfig = TypeOf<typeof TorqConfigSchema>;
export type TorqSecrets = TypeOf<typeof TorqSecretsSchema>;

interface ErrorSchema {
  errorMessage: string;
  errorCode: number;
}

export class TorqConnector extends SubActionConnector<TorqConfig, TorqSecrets> {
  constructor(params: ServiceParams<TorqConfig, TorqSecrets>) {
    super(params);
    this.registerSubAction({
      name: 'sendToTorq',
      method: 'sendToTorqAction',
      schema: schema.object({ id: schema.string() }),
    });
  }

  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Message: ${error.response?.data.errorMessage}. Code: ${error.response?.data.errorCode}`;
  }

  public async sendToTorqAction({ id  }: { id: string; }) {
    // const res = await this.request({
    //   "https://www.google.com",
    //   "data",
    //   headers: { 'X-Test-Header': 'test' },
    //   responseSchema: schema.object({ status: schema.string() }),
    // });
    console.log("send to torq action: ", id);
    // return res;
  }
}