/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { isEqual, pick } from 'lodash';

export const savedSearchComparator = (
  inputSavedSearch: SavedSearch,
  existingSavedSearch: SavedSearch
) => {
  const keysToSelect = [
    'columns',
    'grid',
    'hideChart',
    'sort',
    'timeRange',
    'searchSource.fields.filter',
    'searchSource.fields.index.id',
    'searchSource.fields.query',
    'title',
    'description',
  ];
  const modifiedInputSavedSearch = pick(inputSavedSearch, keysToSelect);
  const modifiedExistingSavedSearch = pick(existingSavedSearch, keysToSelect);

  const result = isEqual(modifiedInputSavedSearch, modifiedExistingSavedSearch);
  return result;
};
