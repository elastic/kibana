/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch, { Response } from 'node-fetch';

const namespace = 'elastic-system';
const USAGE_SERVICE_BASE_API_URL = `http://usage-api.${namespace}/api`;
const USAGE_SERVICE_BASE_API_URL_V1 = `${USAGE_SERVICE_BASE_API_URL}/v1`;
// export const USAGE_SERVICE_USAGE_URL = `${USAGE_SERVICE_BASE_API_URL_V1}/usage`;
export const USAGE_SERVICE_USAGE_URL = `http://localhost:8888/usage`;

export class EndpointUsageReportingService {
  public async reportUsage(records: UsageRecord[]): Promise<Response> {
    return fetch(USAGE_SERVICE_USAGE_URL, {
      method: 'post',
      body: JSON.stringify([records]),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const endpointUsageReportingService = new EndpointUsageReportingService();

export interface UsageRecord {
  id: string;
  usage_timestamp: string;
  creation_timestamp: string;
  usage: UsageMetrics;
  source: UsageSource;
}

export interface UsageSource {
  id: string;
  instance_group_id: string;
  instance_group_type: string;
}

export interface UsageMetrics {
  type: string;
  sub_type?: string;
  quantity: number;
  period_seconds?: number;
  cause?: string;
  metadata?: unknown;
}
