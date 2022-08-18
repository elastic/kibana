/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import queryString from 'query-string';

const PARSE_OPTIONS: queryString.ParseOptions = { arrayFormat: 'bracket' };
const STRINGIFY_OPTIONS: queryString.StringifyOptions = {
  arrayFormat: 'bracket',
  encode: true,
  strict: true,
};

export const parseQueryParams = (search: string) => queryString.parse(search, PARSE_OPTIONS);

export const addQueryParameter = (url: string, key: string, value: string) => {
  const { url: baseUrl, query } = queryString.parseUrl(url, PARSE_OPTIONS);
  query[key] = value;
  return `${baseUrl}?${queryString.stringify(query, STRINGIFY_OPTIONS)}`;
};
