/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { QueryParams, FilterOptions } from '../../../../common/ui';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from '../../../containers/constants';

type UrlQueryParams = Omit<QueryParams, 'page' | 'perPage'> & {
  page: string;
  perPage: string;
};

interface ParseURLReturn {
  queryParams: Partial<QueryParams>;
  filterOptions: Partial<FilterOptions>;
}

export const parseAllCasesURL = (search: string): ParseURLReturn => {
  const { customFields, ...filterOptionsWithoutCustomFields } = DEFAULT_FILTER_OPTIONS;
  const urlParamsMap = new Map<string, Set<string>>();
  const urlParams = new URLSearchParams(search);

  for (const [key, urlParamValue] of urlParams.entries()) {
    const values = urlParamsMap.get(key) ?? new Set();

    urlParamValue
      .split(',')
      .filter(Boolean)
      .forEach((urlValue) => values.add(urlValue));

    urlParamsMap.set(key, values);
  }

  const queryParams: Partial<UrlQueryParams> & Record<string, string | string[]> = {};
  const filterOptions: Partial<FilterOptions> & Record<string, string | string[]> = {};
  const customFieldsParams: FilterOptions['customFields'] = {};

  for (const [key, values] of urlParamsMap.entries()) {
    if (Object.hasOwn(DEFAULT_QUERY_PARAMS, key)) {
      queryParams[key] = parseValue(values, DEFAULT_QUERY_PARAMS[key as keyof QueryParams]);
    }

    if (Object.hasOwn(filterOptionsWithoutCustomFields, key)) {
      filterOptions[key] = parseValue(
        values,
        filterOptionsWithoutCustomFields[key as keyof Omit<FilterOptions, 'customFields'>]
      );
    }

    if (isCustomField(key)) {
      const keyWithoutPrefix = key.replace('cf_', '');
      customFieldsParams[keyWithoutPrefix] = {
        // TOOD: Add the correct type or remove the need for type
        type: CustomFieldTypes.TEXT,
        options: Array.from(values.values()),
      };
    }
  }

  const { page, perPage, ...restQueryParams } = queryParams;

  const queryParamsParsed: Partial<QueryParams> = {
    ...restQueryParams,
    ...(page && {
      page: stringToInteger(page) ?? DEFAULT_QUERY_PARAMS.page,
    }),
    ...(perPage && {
      perPage: stringToInteger(perPage) ?? DEFAULT_QUERY_PARAMS.perPage,
    }),
  };

  return {
    queryParams: queryParamsParsed,
    filterOptions: {
      ...filterOptions,
      ...(!isEmpty(customFieldsParams) && {
        customFields: customFieldsParams,
      }),
    },
  };
};

const stringToInteger = (value: string): number | undefined => {
  const num = Number(value);

  if (isNaN(num)) {
    return;
  }

  return num;
};

const parseValue = (values: Set<string>, defaultValue: unknown): string | string[] => {
  const valuesAsArray = Array.from(values.values());
  return Array.isArray(defaultValue) ? valuesAsArray : valuesAsArray[0] ?? '';
};

const isCustomField = (key: string): boolean => key.startsWith('cf_');
