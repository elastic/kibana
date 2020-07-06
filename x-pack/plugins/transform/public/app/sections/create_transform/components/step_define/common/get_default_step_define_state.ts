/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PivotAggsConfigDict, PivotGroupByConfigDict } from '../../../../../common';
import { SearchItems } from '../../../../../hooks/use_search_items';

import { defaultSearch, QUERY_LANGUAGE_KUERY } from './constants';
import { StepDefineExposedState } from './types';

export function getDefaultStepDefineState(searchItems: SearchItems): StepDefineExposedState {
  return {
    aggList: {} as PivotAggsConfigDict,
    groupByList: {} as PivotGroupByConfigDict,
    isAdvancedPivotEditorEnabled: false,
    isAdvancedSourceEditorEnabled: false,
    searchLanguage: QUERY_LANGUAGE_KUERY,
    searchString: undefined,
    searchQuery: searchItems.savedSearch !== undefined ? searchItems.combinedQuery : defaultSearch,
    sourceConfigUpdated: false,
    valid: false,
  };
}
