/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pick, isNumber } from 'lodash';
import { NO_ASSIGNEES_FILTERING_KEYWORD } from '../../../../common/constants';
import type { AllCasesURLQueryParams, AllCasesTableState } from '../types';

export const allCasesUrlStateSerializer = (state: AllCasesTableState): AllCasesURLQueryParams => {
  const supportedFilterOptions = pick(state.filterOptions, [
    'search',
    'severity',
    'status',
    'tags',
    'assignees',
    'category',
  ]);

  const customFieldsAsQueryParams = Object.entries(state.filterOptions.customFields).reduce(
    (acc, [key, value]) => {
      if (isEmpty(value.options)) {
        return acc;
      }

      return { ...acc, [key]: value.options };
    },
    {}
  );

  const combinedState = {
    ...state.queryParams,
    page: state.queryParams.page,
    perPage: state.queryParams.perPage,
    ...supportedFilterOptions,
    assignees: supportedFilterOptions.assignees.map((assignee) =>
      assignee === null ? NO_ASSIGNEES_FILTERING_KEYWORD : assignee
    ),
    customFields: customFieldsAsQueryParams,
  };

  // filters empty values
  return Object.entries(combinedState).reduce((acc, [key, value]) => {
    // isEmpty returns true for numbers
    if (isEmpty(value) && !isNumber(value)) {
      return acc;
    }

    return Object.assign(acc, { [key]: value });
  }, {});
};
