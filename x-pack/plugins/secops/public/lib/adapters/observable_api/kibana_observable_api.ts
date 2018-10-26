/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ajax } from 'rxjs/ajax';
import { map } from 'rxjs/operators';

import { AppObservableApi, AppObservableApiPostParams, AppObservableApiResponse } from '../../lib';

export class AppKibanaObservableApiAdapter implements AppObservableApi {
  private basePath: string;
  private defaultHeaders: {
    [headerName: string]: string;
  };

  constructor({ basePath, xsrfToken }: { basePath: string; xsrfToken: string }) {
    this.basePath = basePath;
    this.defaultHeaders = {
      'kbn-version': xsrfToken,
    };
  }

  public post = <RequestBody extends {} = {}, ResponseBody extends {} = {}>({
    url,
    body,
  }: AppObservableApiPostParams<RequestBody>): AppObservableApiResponse<ResponseBody> =>
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
