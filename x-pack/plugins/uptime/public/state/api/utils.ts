/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { HttpFetchQuery, HttpSetup } from 'src/core/public';
import * as t from 'io-ts';
import { FETCH_STATUS, AddInspectorRequest } from '../../../../observability/public';

function isObject(value: unknown) {
  const type = typeof value;
  return value != null && (type === 'object' || type === 'function');
}

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils/src/format_errors/index.ts
 */
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
  private _addInspectorRequest!: AddInspectorRequest;

  public get http() {
    return this._http;
  }

  public set http(httpSetup: HttpSetup) {
    this._http = httpSetup;
  }

  public get addInspectorRequest() {
    return this._addInspectorRequest;
  }

  public set addInspectorRequest(addInspectorRequest: AddInspectorRequest) {
    this._addInspectorRequest = addInspectorRequest;
  }

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }

    return ApiService.instance;
  }

  public async get<T>(
    apiUrl: string,
    params?: HttpFetchQuery,
    decodeType?: any,
    asResponse = false
  ) {
    const response = await this._http!.fetch<T>({
      path: apiUrl,
      query: params,
      asResponse,
    });

    this.addInspectorRequest?.({ data: response, status: FETCH_STATUS.SUCCESS, loading: false });

    if (decodeType) {
      const decoded = decodeType.decode(response);
      if (isRight(decoded)) {
        return decoded.right as T;
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

  public async post<T>(apiUrl: string, data?: any, decodeType?: any) {
    const response = await this._http!.post<T>(apiUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (decodeType) {
      const decoded = decodeType.decode(response);
      if (isRight(decoded)) {
        return decoded.right as T;
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `API ${apiUrl} is not returning expected response, ${PathReporter.report(decoded)}`
        );
      }
    }
    return response;
  }

  public async put<T>(apiUrl: string, data?: any, decodeType?: any) {
    const response = await this._http!.put<T>(apiUrl, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (decodeType) {
      const decoded = decodeType.decode(response);
      if (isRight(decoded)) {
        return decoded.right as T;
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `API ${apiUrl} is not returning expected response, ${PathReporter.report(decoded)}`
        );
      }
    }
    return response;
  }

  public async delete<T>(apiUrl: string) {
    const response = await this._http!.delete<T>(apiUrl);
    if (response instanceof Error) {
      throw response;
    }
    return response;
  }
}

export const apiService = ApiService.getInstance();
