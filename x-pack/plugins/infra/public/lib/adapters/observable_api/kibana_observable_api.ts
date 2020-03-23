/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ajax } from 'rxjs/ajax';
import { map } from 'rxjs/operators';

import {
  InfraObservableApi,
  InfraObservableApiPostParams,
  InfraObservableApiResponse,
} from '../../lib';

export class InfraKibanaObservableApiAdapter implements InfraObservableApi {
  private basePath: string;
  private defaultHeaders: {
    [headerName: string]: boolean | string;
  };

  constructor({ basePath }: { basePath: string }) {
    this.basePath = basePath;
    this.defaultHeaders = {
      'kbn-xsrf': true,
    };
  }

  public post = <RequestBody extends {} = {}, ResponseBody extends {} = {}>({
    url,
    body,
  }: InfraObservableApiPostParams<RequestBody>): InfraObservableApiResponse<ResponseBody> =>
    ajax({
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...this.defaultHeaders,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      responseType: 'json',
      timeout: 30000,
      url: `${this.basePath}/api/${url}`,
      withCredentials: true,
    }).pipe(map(({ response, status }) => ({ response, status })));
}
