/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { encode, decode, type RisonObject } from 'rison-node';
import type { LocationDescriptorObject } from 'history';

const encodeRison = (v: RisonObject): string | undefined => {
  try {
    return encode(v);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
};

const decodeRison = <T extends unknown>(query: string): T | undefined => {
  try {
    return decode(query) as T;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
};

const QUERY_PARAM_KEY = 'query';

export const encodeQuery = (query: RisonObject): LocationDescriptorObject['search'] => {
  const risonQuery = encodeRison(query);
  if (!risonQuery) return;
  return `${QUERY_PARAM_KEY}=${risonQuery}`;
};

export const decodeQuery = <T extends unknown>(search?: string): Partial<T> | undefined => {
  const risonQuery = new URLSearchParams(search).get(QUERY_PARAM_KEY);
  if (!risonQuery) return;
  return decodeRison<T>(risonQuery);
};
