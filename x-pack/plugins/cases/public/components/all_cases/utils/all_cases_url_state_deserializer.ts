/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { QueryParams, FilterOptions } from '../../../../common/ui';
import { DEFAULT_CASES_TABLE_STATE } from '../../../containers/constants';
import { CUSTOM_FIELD_KEY_PREFIX } from '../constants';
import type { AllCasesURLQueryParams, AllCasesURLState } from '../types';
import { sanitizeState } from './sanitize_state';

type UrlQueryParams = Omit<QueryParams, 'page' | 'perPage'> & {
  page: string;
  perPage: string;
};

export const allCasesUrlStateDeserializer = (
  urlParamsMap: AllCasesURLQueryParams
): AllCasesURLState => {
  const { customFields, ...filterOptionsWithoutCustomFields } =
    DEFAULT_CASES_TABLE_STATE.filterOptions;

  const queryParams: Partial<UrlQueryParams> & Record<string, string | string[]> = {};
  const filterOptions: Partial<FilterOptions> & Record<string, string | string[]> = {};
  const customFieldsParams: FilterOptions['customFields'] = {};

  for (const [key, values] of Object.entries(urlParamsMap)) {
    if (Object.hasOwn(DEFAULT_CASES_TABLE_STATE.queryParams, key)) {
      queryParams[key] = parseValue(
        values,
        DEFAULT_CASES_TABLE_STATE.queryParams[key as keyof QueryParams]
      );
    }

    if (Object.hasOwn(filterOptionsWithoutCustomFields, key)) {
      filterOptions[key] = parseValue(
        values,
        filterOptionsWithoutCustomFields[key as keyof Omit<FilterOptions, 'customFields'>]
      );
    }

    if (isCustomField(key)) {
      const keyWithoutPrefix = key.replace(CUSTOM_FIELD_KEY_PREFIX, '');
      customFieldsParams[keyWithoutPrefix] = {
        // TOOD: Add the correct type or remove the need for type
        type: CustomFieldTypes.TEXT,
        options: values,
      };
    }
  }

  const { page, perPage, ...restQueryParams } = queryParams;

  const queryParamsParsed: Partial<QueryParams> = {
    ...restQueryParams,
  };

  if (page) {
    queryParamsParsed.page = stringToInteger(page) ?? DEFAULT_CASES_TABLE_STATE.queryParams.page;
  }

  if (perPage) {
    queryParamsParsed.perPage =
      stringToInteger(perPage) ?? DEFAULT_CASES_TABLE_STATE.queryParams.perPage;
  }

  const state = {
    queryParams: queryParamsParsed,
    filterOptions: {
      ...filterOptions,
      ...(!isEmpty(customFieldsParams) && {
        customFields: customFieldsParams,
      }),
    },
  };

  return sanitizeState(state);
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

const isCustomField = (key: string): boolean => key.startsWith(CUSTOM_FIELD_KEY_PREFIX);
