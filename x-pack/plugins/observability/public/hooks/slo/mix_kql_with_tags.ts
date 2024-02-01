/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchState } from '../../pages/slos/hooks/use_url_search_state';

export function mixKqlWithTags(kqlQuery: string, tags: SearchState['tags']) {
  if (!tags) {
    return kqlQuery;
  }
  const includedKqlTags = tags?.included?.join(' or ');
  const excludedKqlTags = tags?.excluded?.join(' or ');

  const queryParts = [];
  if (!!kqlQuery) {
    queryParts.push(kqlQuery);
  }
  if (!!includedKqlTags) {
    queryParts.push(`slo.tags: (${includedKqlTags})`);
  }
  if (!!excludedKqlTags) {
    queryParts.push(`not slo.tags: (${excludedKqlTags})`);
  }
  return queryParts.join(' and ');
}
