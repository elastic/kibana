/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import type { InvestigationStatus } from './types';

// Spelled out rather than imported, so consumers do not need the agentic investigations bundle.
const INVESTIGATION_BY_ID_URL = '/internal/investigations/investigations/{id}';
const AGENTIC_INVESTIGATIONS_API_VERSION = '1';

/** How often an investigation an agent is working on is read again. */
export const INVESTIGATION_POLL_INTERVAL_MS = 5_000;

const MISSING_PRIVILEGES_MESSAGE = i18n.translate(
  'xpack.investigationOutput.missingPrivilegesErrorMessage',
  { defaultMessage: "You don't have permission to view this investigation." }
);
const NOT_FOUND_MESSAGE = i18n.translate('xpack.investigationOutput.notFoundErrorMessage', {
  defaultMessage: "This investigation doesn't exist or is no longer available.",
});

const httpErrorMessage = (error: Error): string => {
  const fetchError = error as IHttpFetchError<ResponseErrorBody>;
  const statusCode = fetchError.response?.status ?? fetchError.body?.statusCode;
  if (statusCode === 403) {
    return MISSING_PRIVILEGES_MESSAGE;
  }
  if (statusCode === 404) {
    return NOT_FOUND_MESSAGE;
  }
  return fetchError.body?.message ?? error.message;
};

export interface UseInvestigationResult {
  status: InvestigationStatus;
  investigation?: Investigation;
  /** Detail message for the `unavailable` status. */
  error?: string;
}

/**
 * Reads an investigation from the shared investigations API
 * (`GET /internal/investigations/investigations/{id}`), and reads it again every few seconds
 * while an agent works on it. A failed read after a successful one keeps the last result, and a
 * failed poll of a running investigation is retried.
 */
export function useInvestigation({
  http,
  investigationId,
}: {
  http: HttpSetup;
  /** The investigation (conversation) id. Nothing is read while it is undefined. */
  investigationId: string | undefined;
}): UseInvestigationResult {
  const [result, setResult] = useState<UseInvestigationResult>({ status: 'loading' });

  useEffect(() => {
    if (!investigationId) {
      return;
    }
    setResult({ status: 'loading' });

    let cancelled = false;
    let wasInProgress = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abortController = new AbortController();

    const read = async () => {
      try {
        const investigation = await http.get<Investigation>(
          INVESTIGATION_BY_ID_URL.replace('{id}', encodeURIComponent(investigationId)),
          { version: AGENTIC_INVESTIGATIONS_API_VERSION, signal: abortController.signal }
        );
        if (cancelled) {
          return;
        }
        wasInProgress = investigation.in_progress;
        setResult({
          status: investigation.in_progress ? 'running' : 'complete',
          investigation,
        });
        if (investigation.in_progress) {
          timer = setTimeout(read, INVESTIGATION_POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setResult((previous) =>
          previous.investigation
            ? previous
            : {
                status: 'unavailable',
                error: error instanceof Error ? httpErrorMessage(error) : String(error),
              }
        );
        // A failed poll of a running investigation is retried; the last result stays meanwhile.
        if (wasInProgress) {
          timer = setTimeout(read, INVESTIGATION_POLL_INTERVAL_MS);
        }
      }
    };

    void read();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      abortController.abort();
    };
  }, [http, investigationId]);

  return result;
}
