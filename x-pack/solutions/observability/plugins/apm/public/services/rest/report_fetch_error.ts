/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

/** Gateway / proxy / timeout statuses that are infrastructure noise, not APM UI bugs. */
const EXPECTED_TRANSPORT_STATUS_CODES = new Set([408, 502, 503, 504]);

/**
 * Returns true for transport / infra failures that should not be reported to APM RUM
 * (they still may surface as user-facing toasts).
 *
 * Relies on Kibana's HTTP client shapes: network failures are `HttpFetchError`s without a
 * response status; application errors carry an HTTP status on `response`.
 */
export const isExpectedTransportFailure = (error: unknown): boolean => {
  if (isAbortError(error)) {
    return true;
  }

  if (!isHttpFetchError(error)) {
    return false;
  }

  const status = error.response?.status;
  if (status == null) {
    return true;
  }

  return EXPECTED_TRANSPORT_STATUS_CODES.has(status);
};
