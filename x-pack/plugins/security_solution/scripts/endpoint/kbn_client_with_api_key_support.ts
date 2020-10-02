/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KbnClient, ToolingLog } from '@kbn/dev-utils';
import { KibanaConfig } from '@kbn/dev-utils/target/kbn_client/kbn_client_requester';
import fetch, { RequestInit as FetchRequestInit } from 'node-fetch';

export class KbnClientWithApiKeySupport extends KbnClient {
  private kibanaUrlNoAuth: string;
  constructor(log: ToolingLog, kibanaConfig: KibanaConfig) {
    super(log, kibanaConfig);
    const kibanaUrl = this.resolveUrl(kibanaConfig.url);
    const matches = kibanaUrl.match(/(https?:\/\/)(.*\:.*\@)(.*)/);
    // strip auth from url
    this.kibanaUrlNoAuth =
      matches && matches.length >= 3
        ? matches[1] + matches[3].replace('/', '')
        : kibanaUrl.replace('/', '');
  }
  /**
   * The fleet api to enroll and agent requires an api key when you mke the request, however KbnClient currently does not support sending an api key with the request. This function allows you to send an api key with a request.
   */
  requestWithApiKey(path: string, init?: RequestInit | undefined): Promise<Response> {
    return (fetch(
      `${this.kibanaUrlNoAuth}${path}`,
      init as FetchRequestInit
    ) as unknown) as Promise<Response>;
  }
}
