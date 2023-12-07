/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { isEqual, pick } from 'lodash';

export const savedSearchComparator = (
  inputSavedSearch: SavedSearch | null,
  existingSavedSearch: SavedSearch | null
) => {
  const inputSavedSearchWithFields = {
    ...inputSavedSearch,
    fields: inputSavedSearch?.searchSource?.getFields(),
  };

  const existingSavedSearchWithFields = {
    ...existingSavedSearch,
    fields: existingSavedSearch?.searchSource?.getFields(),
  };

  const keysToSelect = [
    'columns',
    'grid',
    'hideChart',
    'sort',
    'timeRange',
    'fields.filter',
    'fields.query',
    'title',
    'description',
  ];

  const modifiedInputSavedSearch = pick(inputSavedSearchWithFields, keysToSelect);
  const modifiedExistingSavedSearch = pick(existingSavedSearchWithFields, keysToSelect);

  const result = isEqual(modifiedInputSavedSearch, modifiedExistingSavedSearch);
  return result;
};
