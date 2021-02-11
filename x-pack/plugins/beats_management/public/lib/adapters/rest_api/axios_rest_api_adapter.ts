/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosInstance } from 'axios';
import { FlatObject } from '../../../frontend_types';
import { RestAPIAdapter } from './adapter_types';
let globalAPI: AxiosInstance;

export class AxiosRestAPIAdapter implements RestAPIAdapter {
  constructor(private readonly xsrfToken: string, private readonly basePath: string) {}

  public async get<ResponseData>(url: string, query?: FlatObject<object>): Promise<ResponseData> {
    return await this.REST.get(url, query ? { params: query } : {}).then((resp) => resp.data);
  }

  public async post<ResponseData>(
    url: string,
    body?: { [key: string]: any }
  ): Promise<ResponseData> {
    return await this.REST.post(url, body).then((resp) => resp.data);
  }

  public async delete<T>(url: string): Promise<T> {
    return await this.REST.delete(url).then((resp) => resp.data);
  }

  public async put<ResponseData>(url: string, body?: any): Promise<ResponseData> {
    return await this.REST.put(url, body).then((resp) => resp.data);
  }

  private get REST() {
    if (globalAPI) {
      return globalAPI;
    }

    globalAPI = axios.create({
      baseURL: this.basePath,
      withCredentials: true,
      responseType: 'json',
      timeout: 30000,
      headers: {
        Accept: 'application/json',
        credentials: 'same-origin',
        'Content-Type': 'application/json',
        'kbn-version': this.xsrfToken,
        'kbn-xsrf': this.xsrfToken,
      },
    });
    // Add a request interceptor
    globalAPI.interceptors.request.use(
      (config) => {
        // Do something before request is sent
        return config;
      },
      (error) => {
        // Do something with request error
        return Promise.reject(error);
      }
    );

    // Add a response interceptor
    globalAPI.interceptors.response.use(
      (response) => {
        // Do something with response data
        return response;
      },
      (error) => {
        // Do something with response error
        return Promise.reject(error);
      }
    );

    return globalAPI;
  }
}
