/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { SaveSavedSearchOptions } from '@kbn/saved-search-plugin/public';
import { isEqualWith } from 'lodash';
import { useMemo, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { useDispatch } from 'react-redux';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { DiscoverAppState } from '@kbn/discover-plugin/public/application/main/services/discover_app_state_container';
import type { TimeRange } from '@kbn/es-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDiscoverState } from '../../../timelines/components/timeline/tabs/esql/use_discover_state';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { TimelineId } from '../../../../common/types';
import { timelineActions, timelineSelectors } from '../../../timelines/store';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { useKibana } from '../../lib/kibana';
import { savedSearchComparator } from '../../../timelines/components/timeline/tabs/esql/utils';
import {
  DISCOVER_SEARCH_SAVE_ERROR_TITLE,
  DISCOVER_SEARCH_SAVE_ERROR_UNKNOWN,
} from './translations';

export const defaultDiscoverTimeRange: TimeRange = {
  from: 'now-15m',
  to: 'now',
  mode: 'relative',
};

export const useDiscoverInTimelineActions = (
  discoverStateContainer: RefObject<DiscoverStateContainer | undefined>
) => {
  const { setDiscoverAppState } = useDiscoverState();
  const { addError } = useAppToasts();

  const {
    services: { customDataService: discoverDataService, savedSearch: savedSearchService },
  } = useKibana();

  const dispatch = useDispatch();

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const timeline = useShallowEqualSelector(
    (state) => getTimeline(state, TimelineId.active) ?? timelineDefaults
  );
  const { savedSearchId, version } = timeline;

  // We're using a ref here to prevent a cyclic hook-dependency chain of updateSavedSearch
  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;

  const queryClient = useQueryClient();

  const { mutateAsync: saveSavedSearch, status } = useMutation({
    mutationFn: ({
      savedSearch,
      savedSearchOptions,
    }: {
      savedSearch: SavedSearch;
      savedSearchOptions: SaveSavedSearchOptions;
    }) => savedSearchService.save(savedSearch, savedSearchOptions),
    onSuccess: (data) => {
      // Invalidate and refetch
      if (data) {
        dispatch(
          timelineActions.endTimelineSaving({
            id: TimelineId.active,
          })
        );
      }
      queryClient.invalidateQueries({ queryKey: ['savedSearchById', savedSearchId] });
    },
    mutationKey: [version],
  });

  const defaultDiscoverAppState: DiscoverAppState = useMemo(() => {
    return {
      query: {
        esql: '',
      },
      sort: [['@timestamp', 'desc']],
      columns: [],
      interval: 'auto',
      filters: [],
      hideChart: true,
      grid: {},
    };
  }, []);

  /*
   * generates Appstate from a given saved Search object
   *
   * @param savedSearch
   *
   * */
  const getAppStateFromSavedSearch = useCallback(
    (savedSearch: SavedSearch) => {
      const appState =
        discoverStateContainer.current?.appState.getAppStateFromSavedSearch(savedSearch);
      return {
        savedSearch,
        appState,
      };
    },
    [discoverStateContainer]
  );

  /*
   * resets discover state to a default value
   *
   * */
  const resetDiscoverAppState = useCallback(
    async (newSavedSearchId?: string | null) => {
      if (newSavedSearchId && discoverStateContainer.current) {
        let savedSearch;
        try {
          savedSearch = await discoverStateContainer.current?.savedSearchState.load(
            newSavedSearchId
          );
          const savedSearchState = savedSearch ? getAppStateFromSavedSearch(savedSearch) : null;
          discoverStateContainer.current?.appState.initAndSync(savedSearch);
          await discoverStateContainer.current?.appState.replaceUrlState(
            savedSearchState?.appState ?? {}
          );
          setDiscoverAppState(savedSearchState?.appState ?? defaultDiscoverAppState);
          discoverStateContainer.current?.globalState.set({
            ...discoverStateContainer.current?.globalState.get(),
            time: savedSearch.timeRange ?? defaultDiscoverTimeRange,
          });
        } catch (e) {
          /* empty */
        }
      } else {
        discoverStateContainer.current?.appState.resetToState(defaultDiscoverAppState);
        await discoverStateContainer.current?.appState.replaceUrlState({});
        setDiscoverAppState(defaultDiscoverAppState);
        discoverStateContainer.current?.globalState.set({
          ...discoverStateContainer.current?.globalState.get(),
          time: defaultDiscoverTimeRange,
        });
      }
    },
    [
      defaultDiscoverAppState,
      discoverStateContainer,
      getAppStateFromSavedSearch,
      setDiscoverAppState,
    ]
  );

  const persistSavedSearch = useCallback(
    async (savedSearch: SavedSearch, savedSearchOption: SaveSavedSearchOptions) => {
      if (!discoverStateContainer) {
        // eslint-disable-next-line no-console
        console.log(`Saved search is not open since state container is null`);
        return;
      }
      if (!savedSearch) return;

      function onError(error: Error) {
        addError(error, { title: DISCOVER_SEARCH_SAVE_ERROR_TITLE });
      }
      try {
        const id = await saveSavedSearch({
          savedSearch,
          savedSearchOptions: savedSearchOption,
        });
        if (id) {
          return { id };
        } else {
          addError(DISCOVER_SEARCH_SAVE_ERROR_UNKNOWN, { title: DISCOVER_SEARCH_SAVE_ERROR_TITLE });
        }
      } catch (err) {
        onError(err);
      }
    },
    [addError, discoverStateContainer, saveSavedSearch]
  );

  /*
   * persists the given savedSearch
   *
   * */
  const updateSavedSearch = useCallback(
    async (savedSearch: SavedSearch, timelineId: string) => {
      savedSearch.timeRestore = true;
      savedSearch.timeRange =
        savedSearch.timeRange ?? discoverDataService.query.timefilter.timefilter.getTime();
      savedSearch.tags = ['security-solution-default'];

      // If there is already a saved search, only update the local state
      if (savedSearchId) {
        savedSearch.id = savedSearchId;
        if (!timelineRef.current.savedSearch) {
          dispatch(
            timelineActions.initializeSavedSearch({
              id: TimelineId.active,
              savedSearch,
            })
          );
        } else if (
          !isEqualWith(timelineRef.current.savedSearch, savedSearch, savedSearchComparator)
        ) {
          dispatch(
            timelineActions.updateSavedSearch({
              id: TimelineId.active,
              savedSearch,
            })
          );
        }
      } else {
        // If no saved search exists. Create a new saved search instance and associate it with the timeline.
        try {
          // Make sure we're not creating a saved search while a previous creation call is in progress
          if (status !== 'idle') {
            return;
          }
          dispatch(
            timelineActions.startTimelineSaving({
              id: TimelineId.active,
            })
          );
          const response = await persistSavedSearch(savedSearch, {
            onTitleDuplicate: () => {},
            copyOnSave: !savedSearchId,
          });

          const responseIsEmpty = !response || !response?.id;
          if (responseIsEmpty) {
            throw new Error('Response is empty');
          } else if (!savedSearchId && !responseIsEmpty) {
            dispatch(
              timelineActions.updateSavedSearchId({
                id: TimelineId.active,
                savedSearchId: response.id,
              })
            );
            // Also save the timeline, this will only happen once, in case there is no saved search id yet
            dispatch(timelineActions.saveTimeline({ id: TimelineId.active, saveAsNew: false }));
          }
        } catch (err) {
          dispatch(
            timelineActions.endTimelineSaving({
              id: TimelineId.active,
            })
          );
        }
      }
    },
    [persistSavedSearch, savedSearchId, dispatch, discoverDataService, status]
  );

  const initializeLocalSavedSearch = useCallback(
    async (savedSearch: SavedSearch, timelineId: string) => {
      dispatch(
        timelineActions.initializeSavedSearch({
          id: TimelineId.active,
          savedSearch,
        })
      );
    },
    [dispatch]
  );

  const actions = useMemo(
    () => ({
      resetDiscoverAppState,
      updateSavedSearch,
      initializeLocalSavedSearch,
      getAppStateFromSavedSearch,
      defaultDiscoverAppState,
    }),
    [
      resetDiscoverAppState,
      updateSavedSearch,
      initializeLocalSavedSearch,
      getAppStateFromSavedSearch,
      defaultDiscoverAppState,
    ]
  );

  return actions;
};
