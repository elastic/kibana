/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm } from '@elastic/apm-rum';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { FetcherOperationId } from '../../hooks/fetcher_operation_ids';

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

/** Gateway / proxy / timeout statuses that are infrastructure noise, not APM UI bugs. */
const EXPECTED_TRANSPORT_STATUS_CODES = new Set([408, 502, 503, 504]);

const EXPECTED_TRANSPORT_MESSAGE_PATTERNS = [
  /failed to fetch/i,
  /networkerror/i,
  /network error/i,
  /networkrequestfailed/i,
  /tls handshake/i,
  /backend closed connection/i,
  /load failed/i,
  /request aborted/i,
];

/**
 * Returns true for transport / infra failures that should not be reported to APM RUM
 * (they still may surface as user-facing toasts).
 */
export const isExpectedTransportFailure = (error: unknown): boolean => {
  if (isAbortError(error)) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const status = (error as IHttpFetchError).response?.status;
  if (status != null && EXPECTED_TRANSPORT_STATUS_CODES.has(status)) {
    return true;
  }

  if (error.name === 'NetworkError') {
    return true;
  }

  return EXPECTED_TRANSPORT_MESSAGE_PATTERNS.some((pattern) => pattern.test(error.message));
};

interface ReportFetchErrorParams {
  error: unknown;
  operationId: FetcherOperationId;
}

export const reportFetchError = ({ error, operationId }: ReportFetchErrorParams): void => {
  if (!(error instanceof Error) || isExpectedTransportFailure(error)) {
    return;
  }

  apm.captureError(error, { labels: { kibana_meta_operation_id: operationId } });
};
