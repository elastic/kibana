/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION = 'organization';
export const AGENTLESS_GLOBAL_TAG_NAME_DIVISION = 'division';
export const AGENTLESS_GLOBAL_TAG_NAME_TEAM = 'team';
export const MAXIMUM_RETRIES = 3;

const HTTP_500_INTERNAL_SERVER_ERROR = 500;
const HTTP_501_NOT_IMPLEMENTED = 501;
const HTTP_502_BAD_GATEWAY = 502;
const HTTP_503_SERVICE_UNAVAILABLE = 503;
const HTTP_504_GATEWAY_TIMEOUT = 504;

const ECONNREFUSED_CODE = 'ECONNREFUSED';

export const RETRYABLE_HTTP_STATUSES = [
  HTTP_500_INTERNAL_SERVER_ERROR,
  HTTP_501_NOT_IMPLEMENTED,
  HTTP_502_BAD_GATEWAY,
  HTTP_503_SERVICE_UNAVAILABLE,
  HTTP_504_GATEWAY_TIMEOUT,
];

export const RETRYABLE_SERVER_CODES = [ECONNREFUSED_CODE];
