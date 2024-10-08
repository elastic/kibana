/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestInit, Response } from 'node-fetch';

import fetch from 'node-fetch';
import https from 'https';

import type { UsageRecord } from '../../types';
import type { ServerlessSecurityConfig, UsageApiConfigSchema } from '../../config';

import { USAGE_SERVICE_USAGE_URL, USAGE_REPORTING_ENDPOINT } from '../../constants';

export class UsageReportingService {
  private agent: https.Agent | undefined;

  constructor(private readonly config: ServerlessSecurityConfig) {}

  public async reportUsage(records: UsageRecord[]): Promise<Response> {
    const reqArgs: RequestInit = {
      method: 'post',
      body: JSON.stringify(records),
      headers: { 'Content-Type': 'application/json' },
    };
    if (this.usageApiUrl.includes('https')) {
      reqArgs.agent = this.httpAgent;
    }
    return fetch(this.usageApiUrl, reqArgs);
  }

  private get usageApiConfigs(): NonNullable<UsageApiConfigSchema> {
    const usageApiConfigs = this.config.usageApi;
    if (!usageApiConfigs) {
      throw new Error('UsageReportingService: usageApi configs not provided');
    }

    return usageApiConfigs;
  }

  private get usageApiUrl(): string {
    if (!this.config.usageApi) {
      return USAGE_SERVICE_USAGE_URL;
    }

    return `${this.usageApiConfigs.url}${USAGE_REPORTING_ENDPOINT}`;
  }

  private get httpAgent(): https.Agent {
    if (this.agent) {
      return this.agent;
    }

    // TODO update once we have the CA available
    this.agent = new https.Agent({ rejectUnauthorized: false });

    return this.agent;
  }
}
