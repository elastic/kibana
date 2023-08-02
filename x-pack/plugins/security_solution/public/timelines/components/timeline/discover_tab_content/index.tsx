/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import type { CustomizationCallback } from '@kbn/discover-plugin/public/customizations/types';
import styled, { createGlobalStyle } from 'styled-components';
import type { ScopedHistory } from '@kbn/core/public';
import { useDispatch, useSelector } from 'react-redux';
import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { Subscription } from 'rxjs';
import { isEqual } from 'lodash';
import type { DiscoverAppState } from '@kbn/discover-plugin/public/application/main/services/discover_app_state_container';
import type { InternalState } from '@kbn/discover-plugin/public/application/main/services/discover_internal_state_container';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import {
  updateDiscoverAppState,
  updateDiscoverInternalState,
  updateDiscoverSavedSearchState,
} from '../../../../common/store/discover/actions';
import { useKibana } from '../../../../common/lib/kibana';
import { useGetStatefulQueryBar } from './use_get_stateful_query_bar';
import type { State } from '../../../../common/store';

const HideSearchSessionIndicatorBreadcrumbIcon = createGlobalStyle`
  [data-test-subj='searchSessionIndicator'] {
    display: none;
  }
`;

const EmbeddedDiscoverContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: scroll;
  display: grid,
  place-items: center
`;

export const DiscoverTabContent = () => {
  const history = useHistory();
  const {
    services: { customDataService: discoverDataService, discover },
  } = useKibana();

  const dispatch = useDispatch();

  const { CustomStatefulTopNavKqlQueryBar } = useGetStatefulQueryBar();

  const stateContainerRef = useRef<DiscoverStateContainer>();
  const discoverAppStateSubscription = useRef<Subscription>();

  const discoverInternalStateSubscription = useRef<Subscription>();
  const discoverSavedSearchStateSubscription = useRef<Subscription>();

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

  useEffect(() => {
    if (discoverAppState && !isEqual(stateContainerRef.current?.appState.get(), discoverAppState)) {
      stateContainerRef?.current?.appState.set(discoverAppState);
    }
  }, [discoverAppState]);

  useEffect(() => {
    return () => {
      [
        discoverAppStateSubscription.current,
        discoverInternalStateSubscription.current,
        discoverSavedSearchStateSubscription.current,
      ].forEach((sub) => {
        if (sub) sub.unsubscribe();
      });
    };
  }, []);

  const customize: CustomizationCallback = useCallback(
    ({ customizations, stateContainer }) => {
      customizations.set({
        id: 'search_bar',
        CustomSearchBar: CustomStatefulTopNavKqlQueryBar,
      });

      stateContainerRef.current = stateContainer;

      if (discoverAppState && discoverInternalState && discoverSavedSearchState) {
        stateContainer.internalState.set(discoverInternalState);
        stateContainer.savedSearchState.set(discoverSavedSearchState);
        debugger;
        console.log(`setting appstate to saved app state, `, { discoverAppState });
        stateContainer.appState.set(discoverAppState);
      }

      const unsubscribeState = stateContainer.appState.state$.subscribe({
        next: (state) => {
          dispatch(
            updateDiscoverAppState({
              newState: state,
            })
          );
        },
      });

      const internalStateSubscription = stateContainer.internalState.state$.subscribe({
        next: (state) => {
          dispatch(
            updateDiscoverInternalState({
              newState: state,
            })
          );
        },
      });

      const savedSearchStateSub = stateContainer.savedSearchState.getHasChanged$().subscribe({
        next: (hasChanged) => {
          if (hasChanged) {
            dispatch(
              updateDiscoverSavedSearchState({
                newState: stateContainer.savedSearchState.getState(),
              })
            );
          }
        },
      });

      discoverAppStateSubscription.current = unsubscribeState;
      discoverInternalStateSubscription.current = internalStateSubscription;
      discoverSavedSearchStateSubscription.current = savedSearchStateSub;
    },
    [
      CustomStatefulTopNavKqlQueryBar,
      dispatch,
      discoverAppState,
      discoverInternalState,
      discoverSavedSearchState,
    ]
  );

  const services = useMemo(
    () => ({
      data: discoverDataService,
      filterManager: discoverDataService.query.filterManager,
    }),
    [discoverDataService]
  );

  const DiscoverContainer = discover.DiscoverContainer;

  return (
    <EmbeddedDiscoverContainer data-test-subj="timeline-embedded-discover">
      <HideSearchSessionIndicatorBreadcrumbIcon />
      <DiscoverContainer
        overrideServices={services}
        scopedHistory={history as ScopedHistory}
        customize={customize}
      />
    </EmbeddedDiscoverContainer>
  );
};

// eslint-disable-next-line import/no-default-export
export default DiscoverTabContent;
