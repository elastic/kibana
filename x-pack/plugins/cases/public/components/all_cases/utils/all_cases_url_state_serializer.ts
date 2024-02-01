/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pick } from 'lodash';
import { NO_ASSIGNEES_FILTERING_KEYWORD } from '../../../../common/constants';
import { CUSTOM_FIELD_KEY_PREFIX } from '../constants';
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
    (acc, [key, value]) => ({ ...acc, [`${CUSTOM_FIELD_KEY_PREFIX}${key}`]: value.options }),
    {}
  );

  const combinedState = {
    ...state.queryParams,
    page: state.queryParams.page.toString(),
    perPage: state.queryParams.perPage.toString(),
    ...supportedFilterOptions,
    assignees: supportedFilterOptions.assignees.map((assignee) =>
      assignee === null ? NO_ASSIGNEES_FILTERING_KEYWORD : assignee
    ),
    ...customFieldsAsQueryParams,
  };

  const stateAsQueryParams = Object.entries(combinedState).reduce((acc, [key, value]) => {
    if (isEmpty(value)) {
      return acc;
    }

    return Object.assign(acc, { [key]: parseValue(value) });
  }, {});

  return stateAsQueryParams;
};

const parseValue = <T>(value: T) => (Array.isArray(value) ? value : [value]);
