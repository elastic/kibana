/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, IndexPattern, Query, SavedQuery } from '../../../../../src/plugins/data/public';
import { Document } from '../persistence';

import { TableInspectorAdapter } from '../editor_frame_service/types';

export interface LensAppState {
  persistedDoc?: Document;
  lastKnownDoc?: Document;

  // index patterns used to determine which filters are available in the top nav.
  indexPatternsForTopNav: IndexPattern[];
  // Determines whether the lens editor shows the 'save and return' button, and the originating app breadcrumb.
  isLinkedToOriginatingApp?: boolean;
  isSaveable: boolean;
  activeData?: TableInspectorAdapter;

  isAppLoading: boolean;
  query: Query;
  filters: Filter[];
  savedQuery?: SavedQuery;
  searchSessionId: string;
}

export type DispatchSetState = (
  state: Partial<LensAppState>
) => {
  payload: Partial<LensAppState>;
  type: string;
};

export interface State {
  app: LensAppState;
}

export type GetState = () => State;
