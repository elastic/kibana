/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

export const MIN_SIZE = 10;
export const MAX_SIZE = 10000;

export type MaybeRawData = SearchResponse['fields'] | undefined; // note: this is the type of the "fields" property in the ES response

export const isRawDataValid = (rawData: MaybeRawData): rawData is Record<string, unknown[]> =>
  typeof rawData === 'object' && Object.keys(rawData).every((x) => Array.isArray(rawData[x]));

export const getRawDataOrDefault = (rawData: MaybeRawData): Record<string, unknown[]> =>
  isRawDataValid(rawData) ? rawData : {};

export const sizeIsOutOfRange = (size?: number): boolean =>
  size == null || size < MIN_SIZE || size > MAX_SIZE;
