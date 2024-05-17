/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { url } from '@kbn/kibana-utils-plugin/public';
import { parse, stringify } from 'query-string';

export function toQuery(search?: string) {
  return search ? parse(search.slice(1), { sort: false }) : {};
}

export function fromQuery(query: Record<string, any>) {
  const encodedQuery = url.encodeQuery(query, (value) =>
    encodeURIComponent(value).replace(/%3A/g, ':')
  );

  return stringify(encodedQuery, { sort: false, encode: false });
}
