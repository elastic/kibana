/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError } from 'axios';
import type { Logger } from '@kbn/logging';

export interface SalesforceCredentials {
  domain: string;
  clientId: string;
  clientSecret: string;
}

export interface SalesforceObjects {
  standard: string[];
  custom: string[];
}

const REQUEST_TIMEOUT = 5000; // 5 seconds

export class SalesforceClient {
  private readonly credentials: SalesforceCredentials;
  private accessToken: string | null = null;

  constructor(credentials: SalesforceCredentials, private readonly logger: Logger) {
    this.credentials = credentials;
  }

  private getAuthUrl(): string {
    return `https://${this.credentials.domain}.my.salesforce.com/services/oauth2/token`;
  }

  private getApiUrl(): string {
    return `https://${this.credentials.domain}.my.salesforce.com/services/data/v58.0`;
  }

  async authenticate(): Promise<void> {
    try {
      this.logger.debug('Attempting to authenticate with Salesforce');
      const response = await axios.post(
        this.getAuthUrl(),
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      this.logger.debug('Salesforce authentication response', {
        tags: ['salesforce', 'auth'],
        status: response.status,
        data: response.data,
      });

      this.accessToken = response.data.access_token;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.code === 'ECONNABORTED') {
          throw new Error(
            'Connection to Salesforce timed out. Please check your domain and try again.'
          );
        }
        this.logger.error(error.message);
        throw new Error(
          `Failed to authenticate with Salesforce: ${
            error.response?.data?.error_description || error.message
          }`
        );
      }
      throw error;
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      this.logger.error('Salesforce credentials validation failed', {
        tags: ['salesforce', 'validation', 'error'],
        error,
      });
      return false;
    }
  }

  async getAvailableObjects(): Promise<SalesforceObjects> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.get(`${this.getApiUrl()}/sobjects`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        timeout: REQUEST_TIMEOUT,
      });

      const objects = response.data.sobjects as Array<{ name: string; custom: boolean }>;

      this.logger.debug('Fetched Salesforce objects', {
        tags: ['salesforce', 'objects'],
        count: objects.length,
      });

      return {
        standard: objects.filter((obj) => !obj.custom).map((obj) => obj.name),
        custom: objects.filter((obj) => obj.custom).map((obj) => obj.name),
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.code === 'ECONNABORTED') {
          throw new Error(
            'Connection to Salesforce timed out. Please check your domain and try again.'
          );
        }
        this.logger.error('Failed to fetch Salesforce objects', {
          tags: ['salesforce', 'objects', 'error'],
          status: error.response?.status,
          message: error.message,
        });
        throw new Error(
          `Failed to fetch Salesforce objects: ${
            error.response?.data?.error_description || error.message
          }`
        );
      }
      throw error;
    }
  }
}
