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
    const isHttps = url.includes('https');

    return fetch(url, {
      method: 'post',
      body: JSON.stringify(records),
      headers: { 'Content-Type': 'application/json' },
      agent: isHttps ? agent : undefined, // Conditionally add agent if URL is HTTPS for supporting integration tests.
    });
  }
}

export const usageReportingService = new UsageReportingService();
