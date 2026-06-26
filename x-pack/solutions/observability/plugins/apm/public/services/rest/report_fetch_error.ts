/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm } from '@elastic/apm-rum';

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

interface ReportFetchErrorParams {
  error: unknown;
  operationId: string;
}

export const reportFetchError = ({ error, operationId }: ReportFetchErrorParams): void => {
  if (!(error instanceof Error) || isAbortError(error)) return;

  apm.captureError(error, { labels: { kibana_meta_operation_id: operationId } });
};
