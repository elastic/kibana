/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Response } from 'node-fetch';
import fetch from 'node-fetch';

import { USAGE_SERVICE_USAGE_URL } from '../../constants';
import type { UsageRecord } from '../../types';

export class UsageReportingService {
  public async reportUsage(records: UsageRecord[]): Promise<Response> {
    return fetch(USAGE_SERVICE_USAGE_URL, {
      method: 'post',
      body: JSON.stringify(records),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const usageReportingService = new UsageReportingService();
