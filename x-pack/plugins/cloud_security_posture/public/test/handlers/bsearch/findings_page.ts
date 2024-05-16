/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http, HttpResponse } from 'msw';
import * as findingsJson from './mocks/findings.json';
import * as filteredFindingJson from './mocks/filtered_finding.json';

export const bsearchFindingsPageDefault = http.post(
  'http://localhost/internal/bsearch',
  async ({ request }) => {
    const jsonRequest = await request.json();

    if (
      jsonRequest?.query?.bool?.filter?.[0]?.bool?.should[0]?.term['rule.section']?.value ===
      'Logging and Monitoring'
    ) {
      return HttpResponse.json(filteredFindingJson);
    }

    return HttpResponse.json(findingsJson);
  }
);

export const bsearchFindingsPageNoResults = http.post('http://localhost/internal/bsearch', () => {
  return HttpResponse.json({
    id: 0,
    result: {
      rawResponse: {
        took: 11,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 0,
          max_score: null,
          hits: [],
        },
        aggregations: {
          count: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
      },
      isPartial: false,
      isRunning: false,
      requestParams: {
        method: 'POST',
        path: '/logs-cloud_security_posture.findings_latest-*/_async_search',
        querystring:
          'batched_reduce_size=64&ccs_minimize_roundtrips=true&wait_for_completion_timeout=200ms&keep_on_completion=false&keep_alive=60000ms&ignore_unavailable=false',
      },
      total: 1,
      loaded: 1,
      isRestored: false,
    },
  });
});
