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
  const tagsKqlIncluded = tags.included?.join(' or ') || '';
  const excludedTagsKql = tags.excluded?.join(' or ') || '';

  let tagsQuery = '';
  if (tagsKqlIncluded && excludedTagsKql) {
    tagsQuery = `slo.tags: (${excludedTagsKql}) and not slo.tags: (${tagsKqlIncluded})`;
  }
  if (!excludedTagsKql && tagsKqlIncluded) {
    tagsQuery = `slo.tags: (${tagsKqlIncluded})`;
  }
  if (!tagsKqlIncluded && excludedTagsKql) {
    tagsQuery = `not slo.tags: (${excludedTagsKql})`;
  }

  if (!kqlQuery) {
    return tagsQuery;
  }

  if (tagsQuery) {
    return `${kqlQuery} and ${tagsQuery}`;
  } else {
    return kqlQuery;
  }
}
