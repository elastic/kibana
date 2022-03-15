/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../../../hooks/use_fetcher';

export function useHasRumData() {
  return useFetcher((callApmApi) => {
    return callApmApi('GET /api/apm/observability_overview/has_rum_data', {});
  }, []);
}
