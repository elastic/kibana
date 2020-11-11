/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { URL } from 'url';

import { KbnClient, KbnClientOptions } from '@kbn/dev-utils';
import fetch, { RequestInit } from 'node-fetch';

export class KbnClientWithApiKeySupport extends KbnClient {
  private kibanaUrlNoAuth: URL;

  constructor(options: KbnClientOptions) {
    super(options);

    // strip auth from url
    const url = new URL(this.resolveUrl('/'));
    url.username = '';
    url.password = '';

    this.kibanaUrlNoAuth = url;
  }

  /**
   * The fleet api to enroll and agent requires an api key when you make
   * the request, however KbnClient currently does not support sending
   * an api key with the request. This function allows you to send an
   * api key with a request.
   */
  requestWithApiKey(path: string, init?: RequestInit) {
    return fetch(new URL(path, this.kibanaUrlNoAuth), init);
  }
}
