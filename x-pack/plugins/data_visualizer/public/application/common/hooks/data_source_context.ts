/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';

export const DataSourceContext = createContext<{
  dataView: DataView | never;
  savedSearch: SavedSearch | null;
}>({
  get dataView(): never {
    throw new Error('DataSourceContext is not implemented');
  },
  savedSearch: null,
});

export function useDataSource() {
  return useContext(DataSourceContext);
}
