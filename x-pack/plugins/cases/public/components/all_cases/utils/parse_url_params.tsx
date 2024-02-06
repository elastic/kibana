/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeDecode } from '@kbn/rison';
import { isPlainObject } from 'lodash';
import { SortFieldCase } from '../../../../common/ui';
import { LEGACY_SUPPORTED_STATE_KEYS, ALL_CASES_STATE_URL_KEY } from '../constants';
import type { AllCasesURLQueryParams } from '../types';

type LegacySupportedKeys = typeof LEGACY_SUPPORTED_STATE_KEYS[number];

const legacyDefaultState: Record<LegacySupportedKeys, string | number | string[]> = {
  page: 1,
  perPage: 10,
  sortField: SortFieldCase.createdAt,
  sortOrder: 'desc',
  status: [],
  severity: [],
};
/**
 * Parses legacy state in URL.
 *
 * - Parameters in the query string can have multiple formats:
 *   1. Comma-separated values (e.g., "status=foo,bar")
 *   2. A single value (e.g., "status=foo")
 *   3. Repeated keys (e.g., "status=foo&status=bar")
 *
 */
const parseLegacyUrl = (urlParams: URLSearchParams): AllCasesURLQueryParams => {
  const urlParamsMap = new Map<string, Set<string>>();

  urlParams.forEach((value, key) => {
    if (LEGACY_SUPPORTED_STATE_KEYS.includes(key as LegacySupportedKeys)) {
      const values = urlParamsMap.get(key) ?? new Set();

      value
        .split(',')
        .filter(Boolean)
        .forEach((urlValue) => values.add(urlValue));

      urlParamsMap.set(key, values);
    }
  });

  const entries = new Map(
    [...urlParamsMap].map(([key, value]) => [
      key,
      parseValue(value, legacyDefaultState[key as LegacySupportedKeys]),
    ])
  );

  return Object.fromEntries(entries.entries()) as AllCasesURLQueryParams;
};

const parseValue = (values: Set<string>, defaultValue: unknown): string | string[] => {
  const valuesAsArray = Array.from(values.values());
  return Array.isArray(defaultValue) ? valuesAsArray : valuesAsArray[0] ?? '';
};

export function parseUrlParams(urlParams: URLSearchParams): AllCasesURLQueryParams {
  const allCasesParams = urlParams.get(ALL_CASES_STATE_URL_KEY);

  if (!allCasesParams) {
    return parseLegacyUrl(urlParams);
  }

  const parsedAllCasesParams = safeDecode(allCasesParams);

  if (!parsedAllCasesParams || !isPlainObject(parsedAllCasesParams)) {
    return {};
  }

  return parsedAllCasesParams as AllCasesURLQueryParams;
}
