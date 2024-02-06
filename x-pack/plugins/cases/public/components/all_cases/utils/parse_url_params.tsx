/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeDecode } from '@kbn/rison';
import type { AllCasesURLQueryParams } from '../types';

/**
 * Parses filter options from a URL query string.
 *
 * - Parameters in the query string can have multiple formats:
 *   1. Comma-separated values (e.g., "status=foo,bar")
 *   2. A single value (e.g., "status=foo")
 *   3. Repeated keys (e.g., "status=foo&status=bar")
 *
 */
// export function parseUrlParams(urlParams: URLSearchParams): AllCasesURLQueryParams {
//   const urlParamsMap = new Map<string, Set<string>>();

//   for (const [key, urlParamValue] of urlParams.entries()) {
//     const values = urlParamsMap.get(key) ?? new Set();

//     urlParamValue
//       .split(',')
//       .filter(Boolean)
//       .forEach((urlValue) => values.add(urlValue));

//     urlParamsMap.set(key, values);
//   }

//   const entries = new Map([...urlParamsMap].map(([key, value]) => [key, Array.from(value)]));

//   return Object.fromEntries(entries.entries()) as AllCasesURLQueryParams;
// }

export function parseUrlParams(urlParams: URLSearchParams): AllCasesURLQueryParams {
  // TODO: Support old URL formats
  const allCasesParams = urlParams.get('cases');

  if (!allCasesParams) {
    return {};
  }

  const parsedAllCasesParams = safeDecode(allCasesParams);

  if (!parsedAllCasesParams) {
    return {};
  }

  return parsedAllCasesParams as AllCasesURLQueryParams;
}
