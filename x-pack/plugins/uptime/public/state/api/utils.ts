/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { HttpFetchQuery, HttpSetup } from 'src/core/public';
import * as t from 'io-ts';
import { isObject } from 'lodash';

// TODO: Copied from https://github.com/elastic/kibana/blob/master/x-pack/plugins/security_solution/common/format_errors.ts
// We should figure out a better way to share this
export const formatErrors = (errors: t.Errors): string[] => {
  return errors.map((error) => {
    if (error.message != null) {
      return error.message;
    } else {
      const keyContext = error.context
        .filter(
          (entry) => entry.key != null && !Number.isInteger(+entry.key) && entry.key.trim() !== ''
        )
        .map((entry) => entry.key)
        .join('.');

      const nameContext = error.context.find((entry) => entry.type?.name?.length > 0);
      const suppliedValue =
        keyContext !== '' ? keyContext : nameContext != null ? nameContext.type.name : '';
      const value = isObject(error.value) ? JSON.stringify(error.value) : error.value;
      return `Invalid value "${value}" supplied to "${suppliedValue}"`;
    }
  });
};

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
          `API ${apiUrl} is not returning expected response, ${formatErrors(
            decoded.left
          )} for response`,
          response
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
