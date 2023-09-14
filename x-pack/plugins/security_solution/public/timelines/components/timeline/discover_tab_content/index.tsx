/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { CustomizationCallback } from '@kbn/discover-plugin/public/customizations/types';
import { createGlobalStyle } from 'styled-components';
import type { ScopedHistory } from '@kbn/core/public';
import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { Subscription } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useKibana } from '../../../../common/lib/kibana';
import { useDiscoverState } from './use_discover_state';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSetDiscoverCustomizationCallbacks } from './customizations/use_set_discover_customizations';
import { EmbeddedDiscoverContainer } from './styles';

const HideSearchSessionIndicatorBreadcrumbIcon = createGlobalStyle`
  [data-test-subj='searchSessionIndicator'] {
    display: none;
  }
`;

export const DiscoverTabContent = () => {
  const history = useHistory();
  const {
    services: { customDataService: discoverDataService, discover, dataViews: dataViewService },
  } = useKibana();

  const { dataViewId } = useSourcererDataView(SourcererScopeName.detections);

  const [dataView, setDataView] = useState<DataView | undefined>();

  const stateContainerRef = useRef<DiscoverStateContainer>();

  const discoverAppStateSubscription = useRef<Subscription>();
  const discoverInternalStateSubscription = useRef<Subscription>();
  const discoverSavedSearchStateSubscription = useRef<Subscription>();

  const discoverCustomizationCallbacks = useSetDiscoverCustomizationCallbacks();

  const {
    discoverAppState,
    discoverInternalState,
    discoverSavedSearchState,
    setDiscoverSavedSearchState,
    setDiscoverInternalState,
    setDiscoverAppState,
  } = useDiscoverState();

  useEffect(() => {
    if (!dataViewId) return;
    dataViewService.get(dataViewId).then(setDataView);
  }, [dataViewId, dataViewService]);

  useEffect(() => {
    const unSubscribeAll = () => {
      [
        discoverAppStateSubscription.current,
        discoverInternalStateSubscription.current,
        discoverSavedSearchStateSubscription.current,
      ].forEach((sub) => {
        if (sub) sub.unsubscribe();
      });
    };

    return unSubscribeAll;
  }, []);

  const initialDiscoverCustomizationCallback: CustomizationCallback = useCallback(
    async ({ stateContainer }) => {
      stateContainerRef.current = stateContainer;

      if (discoverAppState && discoverInternalState && discoverSavedSearchState) {
        stateContainer.appState.set(discoverAppState);
        await stateContainer.appState.replaceUrlState(discoverAppState);
      } else {
        // set initial dataView Id
        if (dataView) stateContainer.actions.setDataView(dataView);
      }

      const unsubscribeState = stateContainer.appState.state$.subscribe({
        next: setDiscoverAppState,
      });

      const internalStateSubscription = stateContainer.internalState.state$.subscribe({
        next: setDiscoverInternalState,
      });

      const savedSearchStateSub = stateContainer.savedSearchState.getHasChanged$().subscribe({
        next: (hasChanged) => {
          if (hasChanged) {
            const latestSavedSearchState = stateContainer.savedSearchState.getState();
            setDiscoverSavedSearchState(latestSavedSearchState);
          }
        },
      });

      discoverAppStateSubscription.current = unsubscribeState;
      discoverInternalStateSubscription.current = internalStateSubscription;
      discoverSavedSearchStateSubscription.current = savedSearchStateSub;
    },
    [
      discoverAppState,
      discoverInternalState,
      discoverSavedSearchState,
      setDiscoverSavedSearchState,
      setDiscoverInternalState,
      setDiscoverAppState,
      dataView,
    ]
  );

  const customizationsCallbacks = useMemo(
    () => [initialDiscoverCustomizationCallback, ...discoverCustomizationCallbacks],
    [initialDiscoverCustomizationCallback, discoverCustomizationCallbacks]
  );

  const services = useMemo(
    () => ({
      data: discoverDataService,
      filterManager: discoverDataService.query.filterManager,
    }),
    [discoverDataService]
  );

  const DiscoverContainer = discover.DiscoverContainer;

  const isLoading = !dataView;

  return (
    <EmbeddedDiscoverContainer data-test-subj="timeline-embedded-discover">
      <HideSearchSessionIndicatorBreadcrumbIcon />
      <DiscoverContainer
        overrideServices={services}
        scopedHistory={history as ScopedHistory}
        customizationCallbacks={customizationsCallbacks}
        isLoading={isLoading}
      />
    </EmbeddedDiscoverContainer>
  );
};

// eslint-disable-next-line import/no-default-export
export default DiscoverTabContent;
