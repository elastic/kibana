/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { NO_ASSIGNEES_FILTERING_KEYWORD } from '../../../../common/constants';
import type { QueryParams, FilterOptions, CasesConfigurationUI } from '../../../../common/ui';
import { DEFAULT_CASES_TABLE_STATE } from '../../../containers/constants';
import type { AllCasesURLQueryParams, AllCasesURLState } from '../types';
import { sanitizeState } from './sanitize_state';
import { stringToIntegerWithDefault } from '.';

export const allCasesUrlStateDeserializer = (
  urlParamsMap: AllCasesURLQueryParams,
  customFieldsConfiguration: CasesConfigurationUI['customFields'] = []
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
    queryParamsParsed.page = stringToIntegerWithDefault(
      page,
      DEFAULT_CASES_TABLE_STATE.queryParams.page
    );
  }

  if (perPage) {
    queryParamsParsed.perPage = stringToIntegerWithDefault(
      perPage,
      DEFAULT_CASES_TABLE_STATE.queryParams.perPage
    );
  }

  if (assignees) {
    filterOptionsParsed.assignees = assignees.map((assignee) =>
      assignee === NO_ASSIGNEES_FILTERING_KEYWORD ? null : assignee
    );
  }

  const customFieldsParams = Object.entries(customFields ?? {}).reduce((acc, [key, value]) => {
    const foundCustomField = customFieldsConfiguration.find((cf) => cf.key === key);

    if (!foundCustomField) {
      return acc;
    }

    return { ...acc, [key]: { type: foundCustomField.type, options: value } };
  }, {});

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
