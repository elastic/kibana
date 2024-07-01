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
    console.log('Starting usage report...');

    try {
      // agent.defaultPort = 8080;
      const response2 = await fetch('http://localhost:8081/user', {
        method: 'POST',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('response2:', response2);
    } catch (error) {
      console.log('error in response 2 :', error);
    }
    try {
      const response = await fetch('https://localhost:8081/user', {
        method: 'post',
        body: JSON.stringify(records),
        headers: { 'Content-Type': 'application/json' },
        agent,
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
