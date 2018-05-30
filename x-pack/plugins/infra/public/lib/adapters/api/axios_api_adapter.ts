/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosInstance } from 'axios';
import { InfraApiAdapter, InfraRequestConfig } from '../../lib';

let globalAPI: AxiosInstance;

export class InfraAxiosApiAdapter implements InfraApiAdapter {
  public kbnVersion: string;
  constructor({ kbnVersion }: { kbnVersion: string }) {
    this.kbnVersion = kbnVersion;
  }

  get _api() {
    if (globalAPI) {
      return globalAPI;
    }

    globalAPI = axios.create({
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'kbn-version': this.kbnVersion,
      },
    });
    // Add a request interceptor
    globalAPI.interceptors.request.use(
      config => {
        // Do something before request is sent
        return config;
      },
      error => {
        // Do something with request error
        return Promise.reject(error);
      }
    );

    // Add a response interceptor
    globalAPI.interceptors.response.use(
      response => {
        // Do something with response data
        return response;
      },
      error => {
        // Do something with response error
        return Promise.reject(error);
      }
    );

    return globalAPI;
  }

  public async get<T>(
    url: string,
    config?: InfraRequestConfig | undefined
  ): Promise<T> {
    return await this._api.get(url, config).then(resp => resp.data);
  }

  public async post(
    url: string,
    data?: any,
    config?: InfraRequestConfig | undefined
  ): Promise<object> {
    return await this._api.post(url, data, config).then(resp => resp.data);
  }

  public async delete(
    url: string,
    config?: InfraRequestConfig | undefined
  ): Promise<object> {
    return await this._api.delete(url, config).then(resp => resp.data);
  }

  public async put(
    url: string,
    data?: any,
    config?: InfraRequestConfig | undefined
  ): Promise<object> {
    return await this._api.put(url, data, config).then(resp => resp.data);
  }
}
