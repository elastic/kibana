/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataView, DataViewsContract } from '../../../../../../../src/plugins/data_views/public';
import { SavedSearchSavedObject } from '../../../../common/types/kibana';
import { MlServicesContext } from '../../app';

export interface MlContextValue {
  combinedQuery: any;
  currentDataView: DataView; // TODO this should be DataView or null
  currentSavedSearch: SavedSearchSavedObject | null;
  dataViewsContract: DataViewsContract;
  kibanaConfig: any; // IUiSettingsClient;
  kibanaVersion: string;
}

export type SavedSearchQuery = object;

// In tests, these custom hooks must not be mocked,
// instead <UiChrome.Provider value="mocked-value">` needs
// to be used. This guarantees that we have both properly set up
// TypeScript support and runtime checks for these dependencies.
// Multiple custom hooks can be created to access subsets of
// the overall context value if necessary too,
// see useCurrentIndexPattern() for example.
export const MlContext = React.createContext<Partial<MlContextValue & MlServicesContext>>({});
