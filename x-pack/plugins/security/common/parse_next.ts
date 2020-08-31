/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';
import { isInternalURL } from './is_internal_url';

export function parseNext(href: string, basePath = '') {
  const { query, hash } = parse(href, true);
  if (!query.next) {
    return `${basePath}/`;
  }

  let next: string;
  if (Array.isArray(query.next) && query.next.length > 0) {
    next = query.next[0];
  } else {
    next = query.next as string;
  }

  // validate that `next` is not attempting a redirect to somewhere
  // outside of this Kibana install.
  if (!isInternalURL(next, basePath)) {
    return `${basePath}/`;
  }

  return next + (hash || '');
}
