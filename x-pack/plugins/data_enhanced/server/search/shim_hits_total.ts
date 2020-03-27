/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../src/plugins/data/common/search/es_search';

/**
 * Temporary workaround until https://github.com/elastic/kibana/issues/26356 is addressed.
 * Since we are setting `track_total_hits` in the request, `hits.total` will be an object
 * containing the `value`.
 */
export function shimHitsTotal(rawResponse: IEsSearchResponse) {
  let { response } = rawResponse;
  let { hits } = response;
  const total = hits.total.value ?? hits.total;
  hits = { ...hits, total };
  response = { ...response, hits };
  return { ...rawResponse, response };
}
