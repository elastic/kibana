/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { HttpFetchQuery, HttpSetup } from '../../../../../../target/types/core/public';

class ApiService {
  private static instance: ApiService;
  private _http!: HttpSetup;

  public get http() {
    return this._http;
  }

  public set http(httpSetup: HttpSetup) {
    this._http = httpSetup;
  }

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }

    return ApiService.instance;
  }

  public async get(apiUrl: string, params?: HttpFetchQuery, decodeType?: any) {
    const response = await this._http!.get(apiUrl, { query: params });

    if (decodeType) {
      const decoded = decodeType.decode(response);
      if (isRight(decoded)) {
        return decoded.right;
      } else {
        // eslint-disable-next-line no-console
        console.error(
          `API ${apiUrl} is not returning expected response, ${PathReporter.report(decoded)}`
        );
      }
    }

    return response;
  }

  public async post(apiUrl: string, data?: any, decodeType?: any) {
    const response = await this._http!.post(apiUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (decodeType) {
      const decoded = decodeType.decode(response);
      if (isRight(decoded)) {
        return decoded.right;
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `API ${apiUrl} is not returning expected response, ${PathReporter.report(decoded)}`
        );
      }
    }
    return response;
  }

  public async delete(apiUrl: string) {
    const response = await this._http!.delete(apiUrl);
    if (response instanceof Error) {
      throw response;
    }
    return response;
  }
}

export const apiService = ApiService.getInstance();
