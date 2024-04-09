/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppState } from '@kbn/discover-plugin/public/application/main/services/discover_app_state_container';
import type { InternalState } from '@kbn/discover-plugin/public/application/main/services/discover_internal_state_container';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateDiscoverAppState,
  updateDiscoverInternalState,
  updateDiscoverSavedSearchState,
} from '../../../../../common/store/discover/actions';
import type { State } from '../../../../../common/store';

export const useDiscoverState = () => {
  const discoverAppState = useSelector<State, DiscoverAppState | undefined>((state) => {
    const result = state.discover.app;
    return result;
  });
  const discoverInternalState = useSelector<State, InternalState | undefined>((state) => {
    const result = state.discover.internal;
    return result;
  });
  const discoverSavedSearchState = useSelector<State, SavedSearch | undefined>((state) => {
    const result = state.discover.savedSearch;
    return result;
  });

  const dispatch = useDispatch();

  const setDiscoverAppState = useCallback(
    (newState: DiscoverAppState) => {
      dispatch(updateDiscoverAppState({ newState }));
    },
    [dispatch]
  );

  const setDiscoverInternalState = useCallback(
    (newState: InternalState) => {
      dispatch(updateDiscoverInternalState({ newState }));
    },
    [dispatch]
  );

  const setDiscoverSavedSearchState = useCallback(
    (newState: SavedSearch) => {
      dispatch(updateDiscoverSavedSearchState({ newState }));
    },
    [dispatch]
  );

  return {
    discoverAppState,
    setDiscoverAppState,
    discoverInternalState,
    setDiscoverInternalState,
    discoverSavedSearchState,
    setDiscoverSavedSearchState,
  };
};
