/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { QueryParams, FilterOptions } from '../../../../common/ui';
import { SORT_ORDER_VALUES } from '../../../../common/ui';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from '../../../containers/constants';
import type { AllCasesURLQueryParams, AllCasesURLState } from '../types';
import { CASES_TABLE_PER_PAGE_VALUES } from '../types';

type UrlQueryParams = Omit<QueryParams, 'page' | 'perPage'> & {
  page: string;
  perPage: string;
};

export const allCasesUrlStateDeserializer = (
  urlParamsMap: AllCasesURLQueryParams
): AllCasesURLState => {
  const { customFields, ...filterOptionsWithoutCustomFields } = DEFAULT_FILTER_OPTIONS;

  const queryParams: Partial<UrlQueryParams> & Record<string, string | string[]> = {};
  const filterOptions: Partial<FilterOptions> & Record<string, string | string[]> = {};
  const customFieldsParams: FilterOptions['customFields'] = {};

  for (const [key, values] of Object.entries(urlParamsMap)) {
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
        options: values,
      };
    }
  }

  const { page, perPage, sortOrder, ...restQueryParams } = queryParams;

  const queryParamsParsed: Partial<QueryParams> = {
    ...restQueryParams,
  };

  if (page) {
    const pageAsNumber = stringToInteger(page) ?? DEFAULT_QUERY_PARAMS.page;
    queryParamsParsed.page = pageAsNumber;
  }

  if (perPage) {
    const perPageAsNumber = stringToInteger(perPage) ?? DEFAULT_QUERY_PARAMS.perPage;

    queryParamsParsed.perPage = Math.min(
      perPageAsNumber,
      CASES_TABLE_PER_PAGE_VALUES[CASES_TABLE_PER_PAGE_VALUES.length - 1]
    );
  }

  if (sortOrder) {
    queryParamsParsed.sortOrder = SORT_ORDER_VALUES.includes(sortOrder)
      ? sortOrder
      : DEFAULT_QUERY_PARAMS.sortOrder;
  }

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

const parseValue = (values: string[], defaultValue: unknown): string | string[] => {
  const valuesAsArray = Array.from(values.values());
  return Array.isArray(defaultValue) ? valuesAsArray : valuesAsArray[0] ?? '';
};

const isCustomField = (key: string): boolean => key.startsWith('cf_');
