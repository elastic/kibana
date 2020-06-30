/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LegacyAPICaller } from 'src/core/server';
import { SearchResponse } from 'elasticsearch';

import { ES_SCROLL_SETTINGS } from '../../../common/constants';
import { Hits } from '../../types';

export async function fetchAllFromScroll(
  response: SearchResponse<any>,
  callWithRequest: LegacyAPICaller,
  hits: Hits = []
): Promise<Hits> {
  const newHits = response.hits?.hits || [];
  const scrollId = response._scroll_id;

  if (newHits.length > 0) {
    hits.push(...newHits);

    const innerResponse = await callWithRequest('scroll', {
      body: {
        scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
        scroll_id: scrollId,
      },
    });

    return await fetchAllFromScroll(innerResponse, callWithRequest, hits);
  }

  return hits;
}
