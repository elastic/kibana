/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

/**
 * Temporary workaround until https://github.com/elastic/kibana/issues/26356 is addressed.
 * Since we are setting `track_total_hits` in the request, `hits.total` will be an object
 * containing the `value`.
 */
export function shimHitsTotal(response: SearchResponse<any>) {
  const total = (response.hits?.total as any)?.value ?? response.hits?.total;
  const hits = { ...response.hits, total };
  return { ...response, hits };
}
