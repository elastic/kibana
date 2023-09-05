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
import type { Subscription } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useQuery } from '@tanstack/react-query';
import { debounce, isEqualWith } from 'lodash';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { useDiscoverInTimelineContext } from '../../../../common/components/discover_in_timeline/use_discover_in_timeline_context';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useKibana } from '../../../../common/lib/kibana';
import { useDiscoverState } from './use_discover_state';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSetDiscoverCustomizationCallbacks } from './customizations/use_set_discover_customizations';
import { EmbeddedDiscoverContainer } from './styles';
import { timelineSelectors } from '../../../store/timeline';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineId } from '../../../../../common/types';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { savedSearchComparator } from './utils';

const HideSearchSessionIndicatorBreadcrumbIcon = createGlobalStyle`
  [data-test-subj='searchSessionIndicator'] {
    display: none;
  }
`;

export const DiscoverTabContent = () => {
  const history = useHistory();
  const {
    services: {
      customDataService: discoverDataService,
      discover,
      dataViews: dataViewService,
      savedSearch: savedSearchService,
    },
  } = useKibana();

  const { dataViewId } = useSourcererDataView(SourcererScopeName.detections);

  const [dataView, setDataView] = useState<DataView | undefined>();
  const [discoverTimerange, setDiscoverTimerange] = useState<TimeRange>();
  const [savedSearchLoaded, setSavedSearchLoaded] = useState(false);

  const discoverAppStateSubscription = useRef<Subscription>();
  const discoverInternalStateSubscription = useRef<Subscription>();
  const discoverSavedSearchStateSubscription = useRef<Subscription>();
  const discoverTimerangeSubscription = useRef<Subscription>();

  const {
    discoverStateContainer,
    setDiscoverStateContainer,
    getAppStateFromSavedSearch,
    updateSavedSearch,
    restoreDiscoverAppStateFromSavedSearch,
    resetDiscoverAppState,
  } = useDiscoverInTimelineContext();

  const {
    discoverAppState,
    discoverSavedSearchState,
    setDiscoverSavedSearchState,
    setDiscoverInternalState,
    setDiscoverAppState,
  } = useDiscoverState();

  const discoverCustomizationCallbacks = useSetDiscoverCustomizationCallbacks();

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const timeline = useShallowEqualSelector(
    (state) => getTimeline(state, TimelineId.active) ?? timelineDefaults
  );
  const { status, savedSearchId, activeTab, savedObjectId } = timeline;

  const { data: savedSearchById, isFetching } = useQuery({
    queryKey: ['savedSearchById', savedSearchId ?? ''],
    queryFn: () => (savedSearchId ? savedSearchService.get(savedSearchId) : Promise.resolve(null)),
  });

  useEffect(() => {
    setSavedSearchLoaded(false);
  }, [savedObjectId]);

  useEffect(() => {
    if (isFetching) return; // no-op is fetch is in progress
    if (savedSearchLoaded) return; // no-op if saved search has been already loaded
    if (!savedSearchById) {
      // nothing to restore if savedSearchById is null
      if (status === 'draft') {
        resetDiscoverAppState();
      }
      setSavedSearchLoaded(true);
      return;
    }
    restoreDiscoverAppStateFromSavedSearch(savedSearchById);
    setSavedSearchLoaded(true);
  }, [
    discoverStateContainer,
    savedSearchId,
    savedSearchLoaded,
    status,
    activeTab,
    resetDiscoverAppState,
    savedSearchById,
    getAppStateFromSavedSearch,
    restoreDiscoverAppStateFromSavedSearch,
    isFetching,
  ]);

  const getCombinedDiscoverSavedSearchState: () => SavedSearch | undefined = useCallback(() => {
    if (!discoverSavedSearchState) return;
    return {
      ...(discoverStateContainer.current?.savedSearchState.getState() ?? discoverSavedSearchState),
      timeRange: discoverDataService.query.timefilter.timefilter.getTime(),
      refreshInterval: discoverStateContainer.current?.globalState.get()?.refreshInterval,
      breakdownField: discoverStateContainer.current?.appState.getState().breakdownField,
      rowsPerPage: discoverStateContainer.current?.appState.getState().rowsPerPage,
    };
  }, [
    discoverSavedSearchState,
    discoverStateContainer,
    discoverDataService.query.timefilter.timefilter,
  ]);

  const combinedDiscoverSavedSearchStateRef = useRef<SavedSearch | undefined>();

  const debouncedUpdateSavedSearch = useMemo(
    () => debounce(updateSavedSearch, 1000),
    [updateSavedSearch]
  );

  useEffect(() => {
    if (isFetching) return;
    if (!savedSearchLoaded) return;
    if (!savedObjectId) return;
    if (!status || status === 'draft') return;
    const latestState = getCombinedDiscoverSavedSearchState();
    if (!latestState || combinedDiscoverSavedSearchStateRef.current === latestState) return;
    if (isEqualWith(latestState, savedSearchById, savedSearchComparator)) return;
    debouncedUpdateSavedSearch(latestState);
    combinedDiscoverSavedSearchStateRef.current = latestState;
  }, [
    getCombinedDiscoverSavedSearchState,
    debouncedUpdateSavedSearch,
    savedSearchById,
    updateSavedSearch,
    savedSearchLoaded,
    activeTab,
    status,
    discoverTimerange,
    savedObjectId,
    isFetching,
  ]);

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
        discoverTimerangeSubscription.current,
      ].forEach((sub) => {
        if (sub) sub.unsubscribe();
      });
    };

    return unSubscribeAll;
  }, [discoverStateContainer]);

  const initialDiscoverCustomizationCallback: CustomizationCallback = useCallback(
    async ({ stateContainer }) => {
      setDiscoverStateContainer(stateContainer);
      let savedSearchAppState;
      if (savedSearchById) {
        savedSearchAppState = getAppStateFromSavedSearch(savedSearchById);
      }
      const finalAppState = savedSearchAppState?.appState ?? discoverAppState;

      if (finalAppState) {
        stateContainer.appState.set(finalAppState);
        await stateContainer.appState.replaceUrlState(finalAppState);
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

      const timeRangeSub = discoverDataService.query.timefilter.timefilter
        .getTimeUpdate$()
        .subscribe({
          next: () => {
            setDiscoverTimerange(discoverDataService.query.timefilter.timefilter.getTime());
          },
        });

      discoverAppStateSubscription.current = unsubscribeState;
      discoverInternalStateSubscription.current = internalStateSubscription;
      discoverSavedSearchStateSubscription.current = savedSearchStateSub;
      discoverTimerangeSubscription.current = timeRangeSub;
    },
    [
      discoverAppState,
      setDiscoverSavedSearchState,
      setDiscoverInternalState,
      setDiscoverAppState,
      dataView,
      setDiscoverStateContainer,
      getAppStateFromSavedSearch,
      savedSearchById,
      discoverDataService.query.timefilter.timefilter,
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
      timefilter: discoverDataService.query.timefilter.timefilter,
    }),
    [discoverDataService]
  );

  const DiscoverContainer = discover.DiscoverContainer;

  const isLoading = Boolean(!dataView);

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
