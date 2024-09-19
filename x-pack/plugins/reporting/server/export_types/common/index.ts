/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { decryptJobHeaders } from './decrypt_job_headers';
export { getConditionalHeaders } from './get_conditional_headers';
export { getFullUrls } from './get_full_urls';
export { omitBlockedHeaders } from './omit_blocked_headers';
export { validateUrls } from './validate_urls';
export { generatePngObservableFactory } from './generate_png';
export { getCustomLogo } from './get_custom_logo';
export { setForceNow } from './set_force_now';

export interface TimeRangeParams {
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
