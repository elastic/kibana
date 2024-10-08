/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import https from 'https';
import { merge } from 'lodash';

import type { ServerlessSecurityConfig, UsageApiConfigSchema } from '../../config';
import type { UsageRecord } from '../../types';

import { UsageReportingService } from './usage_reporting_service';
import { USAGE_REPORTING_ENDPOINT, USAGE_SERVICE_USAGE_URL } from '../../constants';

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('UsageReportingService', () => {
  let usageApiConfig: UsageApiConfigSchema;
  let service: UsageReportingService;

  function generateUsageApiConfig(overrides?: Partial<UsageApiConfigSchema>): UsageApiConfigSchema {
    const DEFAULT_USAGE_API_CONFIG = {
      enabled: true,
      url: 'https://usage-api.example',
      tls: {
        certificate: 'cert',
        key: 'key',
        ca: 'ca',
      },
    };
    usageApiConfig = merge(DEFAULT_USAGE_API_CONFIG, overrides);

    return usageApiConfig;
  }

  function setupService(
    usageApi: UsageApiConfigSchema | null = generateUsageApiConfig()
  ): UsageReportingService {
    const config = { usageApi } as ServerlessSecurityConfig;
    service = new UsageReportingService(config);
    return service;
  }

  function generateUsageRecord(overrides?: Partial<UsageRecord>): UsageRecord {
    const date = new Date().toISOString();
    const DEFAULT_USAGE_RECORD = {
      id: 'usage-record-id-1',
      usage_timestamp: date,
      creation_timestamp: date,
      usage: {},
      source: {},
    } as UsageRecord;
    return merge(DEFAULT_USAGE_RECORD, overrides);
  }

  beforeEach(() => {
    setupService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reportUsage', () => {
    it('should send usage records to the usage API', async () => {
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const response = await service.reportUsage(records);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(`${usageApiConfig?.url}${USAGE_REPORTING_ENDPOINT}`, {
        method: 'post',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
        agent: expect.any(https.Agent),
      });
      expect(response).toBe(mockResponse);
    });

    it('should not set agent if the URL is not https', async () => {
      const url = 'http://usage-api.example';
      setupService(generateUsageApiConfig({ url }));
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const response = await service.reportUsage(records);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(`${url}${USAGE_REPORTING_ENDPOINT}`, {
        method: 'post',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response).toBe(mockResponse);
    });

    it('should still work with no configs', async () => {
      setupService(null);
      const usageRecord = generateUsageRecord();
      const records: UsageRecord[] = [usageRecord];
      const mockResponse = new Response(null, { status: 200 });
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const response = await service.reportUsage(records);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(USAGE_SERVICE_USAGE_URL, {
        method: 'post',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
        agent: expect.any(https.Agent),
      });
      expect(response).toBe(mockResponse);
    });
  });
});
