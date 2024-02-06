/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { CustomFieldTypes } from '../../../../common/types/domain';
import { NO_ASSIGNEES_FILTERING_KEYWORD } from '../../../../common/constants';
import type { QueryParams, FilterOptions } from '../../../../common/ui';
import { DEFAULT_CASES_TABLE_STATE } from '../../../containers/constants';
import type { AllCasesURLQueryParams, AllCasesURLState } from '../types';
import { sanitizeState } from './sanitize_state';

export const allCasesUrlStateDeserializer = (
  urlParamsMap: AllCasesURLQueryParams
): AllCasesURLState => {
  const queryParams: Partial<QueryParams> & Record<string, unknown> = {};
  const filterOptions: Partial<FilterOptions> & Record<string, unknown> = {};

  for (const [key, value] of Object.entries(urlParamsMap)) {
    if (Object.hasOwn(DEFAULT_CASES_TABLE_STATE.queryParams, key)) {
      queryParams[key] = value;
    }

    if (Object.hasOwn(DEFAULT_CASES_TABLE_STATE.filterOptions, key)) {
      filterOptions[key] = value;
    }
  }

  const { page, perPage, ...restQueryParams } = queryParams;
  const { assignees, customFields, ...restFilterOptions } = filterOptions;

  const queryParamsParsed: Partial<QueryParams> = {
    ...restQueryParams,
  };

  const filterOptionsParsed: Partial<FilterOptions> = {
    ...restFilterOptions,
  };

  if (page) {
    const pageAsInteger = stringToInteger(page);

    queryParamsParsed.page =
      pageAsInteger && pageAsInteger > 0
        ? pageAsInteger
        : DEFAULT_CASES_TABLE_STATE.queryParams.page;
  }

  if (perPage) {
    const perPageAsInteger = stringToInteger(perPage);

    queryParamsParsed.perPage =
      perPageAsInteger && perPageAsInteger > 0
        ? perPageAsInteger
        : DEFAULT_CASES_TABLE_STATE.queryParams.perPage;
  }

  if (assignees) {
    filterOptionsParsed.assignees = assignees.map((assignee) =>
      assignee === NO_ASSIGNEES_FILTERING_KEYWORD ? null : assignee
    );
  }

  const customFieldsParams = Object.entries(customFields ?? {}).reduce(
    // TODO: Remove type
    (acc, [key, value]) => ({ ...acc, [key]: { type: CustomFieldTypes.TOGGLE, options: value } }),
    {}
  );

  const state: AllCasesURLState = {
    queryParams: queryParamsParsed,
    filterOptions: {
      ...filterOptionsParsed,
      ...(!isEmpty(customFieldsParams) && {
        customFields: customFieldsParams,
      }),
    },
  };

  return sanitizeState(state);
};

const stringToInteger = (value?: string | number): number | undefined => {
  const num = Number(value);

  if (isNaN(num)) {
    return;
  }

  return num;
};
