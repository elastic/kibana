/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'url';

import { NEXT_URL_QUERY_STRING_PARAMETER } from './constants';
import { isInternalURL } from './is_internal_url';

export function parseNext(href: string, basePath = '') {
  const { query, hash } = parse(href, true);

  let next = query[NEXT_URL_QUERY_STRING_PARAMETER];
  if (!next) {
    return `${basePath}/`;
  }

  if (Array.isArray(next) && next.length > 0) {
    next = next[0];
  } else {
    next = next as string;
  }

  // validate that `next` is not attempting a redirect to somewhere
  // outside of this Kibana install.
  if (!isInternalURL(next, basePath)) {
    return `${basePath}/`;
  }

  return next + (hash || '');
}
