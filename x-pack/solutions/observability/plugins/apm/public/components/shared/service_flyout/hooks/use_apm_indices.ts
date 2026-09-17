/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { HttpStart } from '@kbn/core/public';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';

export function useApmIndices({ http }: { http: HttpStart }): {
  indices: APMIndices | undefined;
  loading: boolean;
} {
  const { value, loading } = useAbortableAsync(
    ({ signal }) =>
      http.fetch<APMIndices>('/internal/apm-sources/settings/apm-indices', { signal }),
    [http]
  );

  return { indices: value, loading };
}
