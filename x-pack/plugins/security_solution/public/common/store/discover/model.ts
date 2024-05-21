/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppState } from '@kbn/discover-plugin/public/application/main/state_management/discover_app_state_container';
import type { InternalState } from '@kbn/discover-plugin/public/application/main/state_management/discover_internal_state_container';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';

export interface SecuritySolutionDiscoverState {
  app: DiscoverAppState | undefined;
  internal: InternalState | undefined;
  savedSearch: SavedSearch | undefined;
}

export const initialDiscoverAppState: SecuritySolutionDiscoverState = {
  app: undefined,
  internal: undefined,
  savedSearch: undefined,
};
