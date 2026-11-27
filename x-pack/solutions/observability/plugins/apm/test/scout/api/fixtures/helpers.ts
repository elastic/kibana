/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import type { ApmDocumentType, RollupInterval } from '@kbn/apm-types';

/**
 * Requests the service map. `kuery` defaults to empty; the query sets the rest. `apiClient` comes
 * first, on its own, so lint can see each test calls the endpoint through it.
 */
export const getServiceMap = (
  apiClient: ApiClientFixture,
  { headers, query }: { headers: Record<string, string>; query: Record<string, string> }
) =>
  apiClient.get(`internal/apm/service-map?${new URLSearchParams({ kuery: '', ...query })}`, {
    headers,
    responseType: 'json',
  });

/** The data source query parameters the service map needs when grouping is enabled. */
export const toSourceQuery = ({
  documentType,
  rollupInterval,
  useDurationSummary,
}: {
  documentType: ApmDocumentType;
  rollupInterval: RollupInterval;
  useDurationSummary: boolean;
}): Record<string, string> => ({
  documentType,
  rollupInterval,
  useDurationSummary: String(useDurationSummary),
});
