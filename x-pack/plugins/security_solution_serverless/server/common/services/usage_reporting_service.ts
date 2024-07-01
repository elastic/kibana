/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Response } from 'node-fetch';
import fetch from 'node-fetch';
import https from 'https';

import { USAGE_SERVICE_USAGE_URL } from '../../constants';
import type { UsageRecord } from '../../types';

// TODO remove once we have the CA available
const agent = new https.Agent({ rejectUnauthorized: false });

export class UsageReportingService {
  public async reportUsage(
    records: UsageRecord[],
    url = USAGE_SERVICE_USAGE_URL
  ): Promise<Response> {
    try {
      const isHttps = url.includes('https');
      const response = await fetch(url, {
        method: 'post',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
        ...(isHttps && { agent }), // Conditionally add agent if URL is HTTPS for supporting integration tests.
      });

      if (!response.ok) {
        console.error(`Error: ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Usage report completed successfully.');
      return response;
    } catch (error) {
      console.error('Error during usage report:', JSON.stringify(error));
      console.error('Error:', error.erros);
      throw error;
    }
  }
}

export const usageReportingService = new UsageReportingService();
