/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';

interface TLSSettings {
  rejectUnauthorized?: boolean;
  cert?: string;
  key?: string;
  ca?: string;
}

export class SimpleAPIClient {
  private baseUrl: string;
  private authorization: string;
  private httpsAgent: https.Agent;

  constructor(baseUrl: string, username?: string, password?: string, tlsConfig: TLSSettings = {}) {
    this.baseUrl = baseUrl;
    this.authorization =
      username && password
        ? `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        : '';
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: tlsConfig.rejectUnauthorized ?? true,
      cert: tlsConfig.cert,
      key: tlsConfig.key,
      ca: tlsConfig.ca,
    });
  }

  async get(endpoint: string) {
    return this.request('GET', endpoint);
  }

  async post(endpoint: string, data: any) {
    return this.request('POST', endpoint, data);
  }

  async put(endpoint: string, data: any) {
    return this.request('PUT', endpoint, data);
  }

  async delete(endpoint: string) {
    return this.request('DELETE', endpoint);
  }

  private async request(method: string, endpoint: string, data: any = null) {
    const url = `${this.baseUrl}/${endpoint}`;
    const headers = this.authorization ? { Authorization: this.authorization } : {};

    const config: AxiosRequestConfig = {
      method,
      url,
      data,
      headers,
      httpsAgent: this.httpsAgent,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // console.error(`Error during ${method} request to ${url}: ${error.message}`);
      throw error;
    }
  }
}
