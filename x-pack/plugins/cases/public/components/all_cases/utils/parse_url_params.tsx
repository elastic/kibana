/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeDecode } from '@kbn/rison';
import { isPlainObject } from 'lodash';
import type { CaseStatuses } from '@kbn/cases-components';
import type { CaseSeverity } from '../../../../common';
import { DEFAULT_CASES_TABLE_STATE } from '../../../containers/constants';
import { stringToIntegerWithDefault } from '.';
import { SortFieldCase } from '../../../../common/ui';
import { LEGACY_SUPPORTED_STATE_KEYS, ALL_CASES_STATE_URL_KEY } from '../constants';
import { AllCasesURLQueryParamsRt, validateSchema } from '../schema';
import type { AllCasesURLQueryParams } from '../types';

type LegacySupportedKeys = (typeof LEGACY_SUPPORTED_STATE_KEYS)[number];

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

  const params = Object.fromEntries(entries.entries());
  const allCasesParams: AllCasesURLQueryParams = { ...params };

  if (params.page) {
    allCasesParams.page = stringToIntegerWithDefault(
      Array.isArray(params.page) ? params.page[0] : params.page,
      DEFAULT_CASES_TABLE_STATE.queryParams.page
    );
  }

  if (params.perPage) {
    allCasesParams.perPage = stringToIntegerWithDefault(
      Array.isArray(params.perPage) ? params.perPage[0] : params.perPage,
      DEFAULT_CASES_TABLE_STATE.queryParams.perPage
    );
  }

  if (params.status) {
    const statusAsArray = Array.isArray(params.status) ? params.status : [params.status];
    allCasesParams.status = statusAsArray.filter(notAll).filter(Boolean) as CaseStatuses[];
  }

  if (params.severity) {
    const severityAsArray = Array.isArray(params.severity) ? params.severity : [params.severity];
    allCasesParams.severity = severityAsArray.filter(notAll).filter(Boolean) as CaseSeverity[];
  }

  return allCasesParams;
};

const parseValue = (values: Set<string>, defaultValue: unknown): string | string[] => {
  const valuesAsArray = Array.from(values.values());
  return Array.isArray(defaultValue) ? valuesAsArray : valuesAsArray[0] ?? '';
};

const notAll = (option: string) => option !== 'all';

export function parseUrlParams(urlParams: URLSearchParams): AllCasesURLQueryParams {
  const allCasesParams = urlParams.get(ALL_CASES_STATE_URL_KEY);

  if (!allCasesParams) {
    return parseAndValidateLegacyUrl(urlParams);
  }

  const parsedAllCasesParams = safeDecode(allCasesParams);

  if (!parsedAllCasesParams || !isPlainObject(parsedAllCasesParams)) {
    return {};
  }

  const validatedAllCasesParams = validateSchema(parsedAllCasesParams, AllCasesURLQueryParamsRt);

  if (!validatedAllCasesParams) {
    return {};
  }

  return validatedAllCasesParams;
}

const parseAndValidateLegacyUrl = (urlParams: URLSearchParams): AllCasesURLQueryParams => {
  const validatedUrlParams = validateSchema(parseLegacyUrl(urlParams), AllCasesURLQueryParamsRt);

  if (!validatedUrlParams) {
    return {};
  }

  return validatedUrlParams;
};
