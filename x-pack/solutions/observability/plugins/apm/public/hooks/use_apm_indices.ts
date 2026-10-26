/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { HttpStart } from '@kbn/core/public';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';

/**
 * Parent-owned APM indices. The object itself is the signal that a parent already
 * resolves them: `indices` may still be undefined while that request is in flight.
 * Omit the object entirely when this flyout should fetch for itself.
 */
export interface ApmIndicesSource {
  indices: APMIndices | null | undefined;
}

export function useApmIndices({
  http,
  enabled = true,
}: {
  http: HttpStart;
  /** When false, skip the request. Callers that already have indices pass false. */
  enabled?: boolean;
}): {
  indices: APMIndices | undefined;
  loading: boolean;
} {
  const { value, loading, error } = useAbortableAsync(
    ({ signal }) => {
      if (!enabled) {
        return undefined;
      }
      return http.fetch<APMIndices>('/internal/apm-sources/settings/apm-indices', { signal });
    },
    [http, enabled]
  );

  // useAbortableAsync starts with loading=false, which would look like a finished
  // empty result on the first render. Treat "enabled, no value, no error" as in flight.
  const pending = enabled && value === undefined && error === undefined;

  return {
    indices: enabled ? value : undefined,
    loading: enabled && (loading || pending),
  };
}

/** Uses parent-owned APM indices, or fetches them when no parent provided a source. */
export function useResolvedApmIndices({
  http,
  indicesSource,
}: {
  http: HttpStart;
  indicesSource?: ApmIndicesSource;
}): APMIndices | null | undefined {
  const shouldFetch = indicesSource === undefined;
  const { indices: fetchedIndices, loading } = useApmIndices({ http, enabled: shouldFetch });

  if (!shouldFetch) {
    return indicesSource.indices;
  }

  return loading ? undefined : fetchedIndices ?? null;
}
