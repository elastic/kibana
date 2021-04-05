/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../common/lib/kibana';

// TODO: Use a more common basic signal or do we keep this duplicated everywhere for now?
export interface BasicSignals {
  signal: AbortSignal;
}

/**
 * Creates transforms given a configuration
 * TODO: Take configuration option so we can loop over it and determine what to push for the body (or take the body)
 * TODO: Add the return signature
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const createTransforms = async ({ signal }: BasicSignals) => {
  // TODO: Use constants for the url
  // TODO: Push the body down from the settings configuration
  return KibanaServices.get().http.fetch('/api/metrics_summary/transforms', {
    method: 'POST',
    body: JSON.stringify({
      query: {
        range: {
          '@timestamp': {
            gte: 'now-1w',
            format: 'strict_date_optional_time',
          },
        },
      },
      prefix: 'all',
      modules: ['security_solutions'],
      indices: ['auditbeat-*'],
      auto_start: true,
      settings: {
        max_page_search_size: 5000,
      },
    }),
    signal,
  });
};
