/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PivotAggsConfigDict, PivotGroupByConfigDict } from '../../../../../common';
import { SearchItems } from '../../../../../hooks/use_search_items';

import { defaultSearch, QUERY_LANGUAGE_KUERY } from './constants';
import { StepDefineState } from './types';
import { TRANSFORM_FUNCTION } from '../../../../../../../common/constants';
import { LatestFunctionConfigUI } from '../../../../../../../common/types/transform';

export function getDefaultStepDefineState(searchItems?: SearchItems): StepDefineState {
  return {
    transformFunction: TRANSFORM_FUNCTION.PIVOT,
    latestConfig: {} as LatestFunctionConfigUI,
    aggList: {} as PivotAggsConfigDict,
    groupByList: {} as PivotGroupByConfigDict,
    isDatePickerApplyEnabled: false,
    searchLanguage: QUERY_LANGUAGE_KUERY,
    searchString: undefined,
    searchQuery:
      searchItems && searchItems.savedSearch !== undefined
        ? searchItems.combinedQuery
        : defaultSearch,
    validationStatus: {
      isValid: false,
    },
  };
}
