/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { MlServicesContext } from '../../app';

export interface MlContextValue {
  combinedQuery: any;
  selectedDataView: DataView; // // TODO this should be DataView or null
  selectedSavedSearch: SavedSearch | null;
  dataViewsContract: DataViewsContract;
  kibanaConfig: IUiSettingsClient;
}

export type SavedSearchQuery = object;

// In tests, these custom hooks must not be mocked,
// instead <UiChrome.Provider value="mocked-value">` needs
// to be used. This guarantees that we have both properly set up
// TypeScript support and runtime checks for these dependencies.
// Multiple custom hooks can be created to access subsets of
// the overall context value if necessary too.
export const MlContext = React.createContext<Partial<MlContextValue & MlServicesContext>>({});
