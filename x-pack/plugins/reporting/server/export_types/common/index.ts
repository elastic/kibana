/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { decryptJobHeaders } from './decrypt_job_headers';
export { getConditionalHeaders } from './get_conditional_headers';
export { getFullUrls } from './get_full_urls';
export { omitBlockedHeaders } from './omit_blocked_headers';
export { validateUrls } from './validate_urls';

export interface TimeRangeParams {
  timezone: string;
  min?: Date | string | number | null;
  max?: Date | string | number | null;
}

export interface ConditionalHeadersConditions {
  protocol: string;
  hostname: string;
  port: number;
  basePath: string;
}

export interface ConditionalHeaders {
  headers: Record<string, string>;
  conditions: ConditionalHeadersConditions;
}
