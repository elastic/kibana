/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { DiscoverAppState } from '@kbn/discover-plugin/public/application/main/services/discover_app_state_container';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { RefObject } from 'react';
import { createContext } from 'react';

interface DiscoverInTimelineContextType {
  discoverStateContainer: RefObject<DiscoverStateContainer | undefined>;
  setDiscoverStateContainer: (stateContainer: DiscoverStateContainer) => void;
  saveDataSource: unknown;
  resetDiscoverState: unknown;
  restoreDiscoverSavedSearch: unknown;
  updateSavedSearch: unknown;
  getAppStateFromSavedSearchId: (savedSearchId: string) => Promise<{
    savedSearch: SavedSearch;
    appState: DiscoverAppState;
  }>;
}

export const DiscoverInTimelineContext = createContext<DiscoverInTimelineContextType | null>(null);
