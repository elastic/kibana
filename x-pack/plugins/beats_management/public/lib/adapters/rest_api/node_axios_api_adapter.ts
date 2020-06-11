/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import { join, resolve } from 'path';
import { FlatObject } from '../../../frontend_types';
import { RestAPIAdapter } from './adapter_types';
const pkg = JSON.parse(
  fs.readFileSync(resolve(join(__dirname, '../../../../../../../../package.json'))).toString()
);

let globalAPI: AxiosInstance;

export class NodeAxiosAPIAdapter implements RestAPIAdapter {
  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly basePath: string
  ) {}

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
      timeout: 60 * 10 * 1000, // 10min
      auth: {
        username: this.username,
        password: this.password,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'kbn-version': (pkg as any).version,
        'kbn-xsrf': 'xxx',
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
        return Promise.reject(JSON.stringify(error.response.data));
      }
    );

    return globalAPI;
  }
}
