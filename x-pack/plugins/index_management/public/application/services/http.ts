/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpClient } from '../../../../../../src/core/public';

export class HttpService {
  private client: any;

  public setup(httpClient: HttpClient): void {
    this.client = httpClient;
  }

  public get httpClient(): HttpClient {
    return this.client;
  }
}

export const httpService = new HttpService();
