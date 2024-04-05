/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { CustomizationCallback } from '@kbn/discover-plugin/public/customizations/types';
import { createGlobalStyle } from 'styled-components';
import type { ScopedHistory } from '@kbn/core/public';
import type { Subscription } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useQuery } from '@tanstack/react-query';
import { isEqualWith } from 'lodash';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { useDispatch } from 'react-redux';
import { useDiscoverInTimelineContext } from '../../../../common/components/discover_in_timeline/use_discover_in_timeline_context';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useKibana } from '../../../../common/lib/kibana';
import { useDiscoverState } from './use_discover_state';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSetDiscoverCustomizationCallbacks } from './customizations/use_set_discover_customizations';
import { EmbeddedDiscoverContainer } from './styles';
import { timelineSelectors } from '../../../store';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineDefaults } from '../../../store/defaults';
import { savedSearchComparator } from './utils';
import { GET_TIMELINE_DISCOVER_SAVED_SEARCH_TITLE } from './translations';

const HideSearchSessionIndicatorBreadcrumbIcon = createGlobalStyle`
  [data-test-subj='searchSessionIndicator'] {
    display: none;
  }
`;

interface DiscoverTabContentProps {
  timelineId: string;
}

export const DiscoverTabContent: FC<DiscoverTabContentProps> = ({ timelineId }) => {
  const history = useHistory();
  const {
    services: {
      customDataService: discoverDataService,
      discover,
      dataViews: dataViewService,
      savedSearch: savedSearchService,
    },
  } = useKibana();

  const dispatch = useDispatch();

  const { dataViewId } = useSourcererDataView(SourcererScopeName.detections);

  const [dataView, setDataView] = useState<DataView | undefined>();
  const [discoverTimerange, setDiscoverTimerange] = useState<TimeRange>();

  const discoverAppStateSubscription = useRef<Subscription>();
  const discoverInternalStateSubscription = useRef<Subscription>();
  const discoverSavedSearchStateSubscription = useRef<Subscription>();
  const discoverTimerangeSubscription = useRef<Subscription>();

  const {
    discoverStateContainer,
    setDiscoverStateContainer,
    getAppStateFromSavedSearch,
    updateSavedSearch,
    initializeLocalSavedSearch,
    defaultDiscoverAppState,
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
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );
  const { status, savedSearchId, activeTab, savedObjectId, title, description } = timeline;

  const { data: savedSearchById, isFetching } = useQuery({
    queryKey: ['savedSearchById', savedSearchId ?? ''],
    queryFn: () => (savedSearchId ? savedSearchService.get(savedSearchId) : Promise.resolve(null)),
  });

  const getCombinedDiscoverSavedSearchState: () => SavedSearch | undefined = useCallback(() => {
    if (!discoverSavedSearchState) return;
    return {
      ...(discoverStateContainer.current?.savedSearchState.getState() ?? discoverSavedSearchState),
      timeRange: discoverDataService.query.timefilter.timefilter.getTime(),
      refreshInterval: discoverStateContainer.current?.globalState.get()?.refreshInterval,
      breakdownField: discoverStateContainer.current?.appState.getState().breakdownField,
      rowsPerPage: discoverStateContainer.current?.appState.getState().rowsPerPage,
      title: GET_TIMELINE_DISCOVER_SAVED_SEARCH_TITLE(title),
      description,
    };
  }, [
    discoverSavedSearchState,
    discoverStateContainer,
    discoverDataService.query.timefilter.timefilter,
    title,
    description,
  ]);

  const combinedDiscoverSavedSearchStateRef = useRef<SavedSearch | undefined>();

  useEffect(() => {
    if (isFetching) return;
    if (!savedObjectId) return;
    if (!status || status === 'draft') return;
    const latestState = getCombinedDiscoverSavedSearchState();
    const index = latestState?.searchSource.getDataViewLazy();
    /* when a new timeline is loaded, a new discover instance is loaded which first emits
     * discover's initial state which is then updated in the saved search. We want to avoid that.*/
    if (!index) return;
    if (!latestState || combinedDiscoverSavedSearchStateRef.current === latestState) return;
    if (isEqualWith(latestState, savedSearchById, savedSearchComparator)) return;
    updateSavedSearch(latestState, timelineId);
    combinedDiscoverSavedSearchStateRef.current = latestState;
  }, [
    getCombinedDiscoverSavedSearchState,
    savedSearchById,
    updateSavedSearch,
    activeTab,
    status,
    discoverTimerange,
    savedObjectId,
    isFetching,
    timelineId,
    dispatch,
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
      if (savedSearchId) {
        const localSavedSearch = await savedSearchService.get(savedSearchId);
        initializeLocalSavedSearch(localSavedSearch, timelineId);
        savedSearchAppState = getAppStateFromSavedSearch(localSavedSearch);
      }

      const finalAppState =
        (((await savedSearchAppState?.appState)?.query &&
          'esql' in (await savedSearchAppState?.appState)?.query &&
          savedSearchAppState?.appState) ||
          discoverAppState) ??
        defaultDiscoverAppState;

      const hasESQLUrlState = (stateContainer.appState.getState()?.query as { esql: string })?.esql;

      if (stateContainer.appState.isEmptyURL() || !hasESQLUrlState) {
        if (savedSearchAppState?.savedSearch.timeRange) {
          stateContainer.globalState.set({
            ...stateContainer.globalState.get(),
            time: savedSearchAppState?.savedSearch.timeRange,
          });
        }
        stateContainer.appState.set(finalAppState);
        await stateContainer.appState.replaceUrlState(finalAppState);
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
      setDiscoverStateContainer,
      getAppStateFromSavedSearch,
      discoverDataService.query.timefilter.timefilter,
      savedSearchId,
      savedSearchService,
      defaultDiscoverAppState,
      timelineId,
      initializeLocalSavedSearch,
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
