/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { SaveSavedSearchOptions } from '@kbn/saved-search-plugin/public';
import type { RefObject } from 'react';
import { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { DiscoverAppState } from '@kbn/discover-plugin/public/application/main/services/discover_app_state_container';
import type { TimeRange } from '@kbn/es-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endTimelineSaving, startTimelineSaving } from '../../../timelines/store/timeline/actions';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { TimelineId } from '../../../../common/types';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { useKibana } from '../../lib/kibana';
import { useSourcererDataView } from '../../containers/sourcerer';
import { SourcererScopeName } from '../../store/sourcerer/model';
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
  const { addError } = useAppToasts();

  const {
    services: {
      customDataService: discoverDataService,
      savedSearch: savedSearchService,
      dataViews: dataViewService,
    },
  } = useKibana();

  const dispatch = useDispatch();

  const { dataViewId } = useSourcererDataView(SourcererScopeName.detections);

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const timeline = useShallowEqualSelector(
    (state) => getTimeline(state, TimelineId.active) ?? timelineDefaults
  );
  const { savedSearchId } = timeline;

  const queryClient = useQueryClient();

  const { mutateAsync: saveSavedSearch } = useMutation({
    mutationFn: ({
      savedSearch,
      savedSearchOptions,
    }: {
      savedSearch: SavedSearch;
      savedSearchOptions: SaveSavedSearchOptions;
    }) => savedSearchService.save(savedSearch, savedSearchOptions),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['savedSearchById', savedSearchId] });
    },
  });

  const getDefaultDiscoverAppState: () => Promise<DiscoverAppState> = useCallback(async () => {
    const localDataViewId = dataViewId ?? 'security-solution-default';

    const dataView = await dataViewService.get(localDataViewId);

    return {
      query: {
        esql: dataView ? `from ${dataView.getIndexPattern()} | limit 10` : '',
      },
      sort: [['@timestamp', 'desc']],
      columns: [],
      interval: 'auto',
      filters: [],
      hideChart: true,
      grid: {},
    };
  }, [dataViewService, dataViewId]);

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
   * restores the url state of discover in timeline
   *
   * @param savedSearch
   * */
  const restoreDiscoverAppStateFromSavedSearch = useCallback(
    (savedSearch: SavedSearch) => {
      const { appState } = getAppStateFromSavedSearch(savedSearch);
      if (!appState) return;
      discoverStateContainer.current?.appState.set(appState);
      const timeRangeFromSavedSearch = savedSearch.timeRange;
      discoverStateContainer.current?.globalState.set({
        ...discoverStateContainer.current?.globalState.get(),
        time: timeRangeFromSavedSearch ?? defaultDiscoverTimeRange,
      });
    },
    [getAppStateFromSavedSearch, discoverStateContainer]
  );

  /*
   * resets discover state to a default value
   *
   * */
  const resetDiscoverAppState = useCallback(async () => {
    const defaultDiscoverAppState = await getDefaultDiscoverAppState();
    discoverStateContainer.current?.appState.replaceUrlState(defaultDiscoverAppState);
    discoverStateContainer.current?.globalState.set({
      ...discoverStateContainer.current?.globalState.get(),
      time: defaultDiscoverTimeRange,
    });
  }, [getDefaultDiscoverAppState, discoverStateContainer]);

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
      dispatch(
        startTimelineSaving({
          id: timelineId,
        })
      );
      savedSearch.timeRestore = true;
      savedSearch.timeRange =
        savedSearch.timeRange ?? discoverDataService.query.timefilter.timefilter.getTime();
      savedSearch.tags = ['security-solution-default'];

      if (savedSearchId) {
        savedSearch.id = savedSearchId;
      }
      try {
        const response = await persistSavedSearch(savedSearch, {
          onTitleDuplicate: () => {},
          copyOnSave: !savedSearchId,
        });

        if (!response || !response.id) {
          throw new Error('Unknown Error occured');
        }

        if (!savedSearchId) {
          dispatch(
            timelineActions.updateSavedSearchId({
              id: TimelineId.active,
              savedSearchId: response.id,
            })
          );
          // Also save the timeline, this will only happen once, in case there is no saved search id yet
          dispatch(timelineActions.saveTimeline({ id: TimelineId.active }));
        }
      } catch (err) {
        addError(DISCOVER_SEARCH_SAVE_ERROR_TITLE, {
          title: DISCOVER_SEARCH_SAVE_ERROR_TITLE,
          toastMessage: String(err),
        });
      } finally {
        dispatch(
          endTimelineSaving({
            id: timelineId,
          })
        );
      }
    },
    [persistSavedSearch, savedSearchId, addError, dispatch, discoverDataService]
  );

  const actions = useMemo(
    () => ({
      resetDiscoverAppState,
      restoreDiscoverAppStateFromSavedSearch,
      updateSavedSearch,
      getAppStateFromSavedSearch,
      getDefaultDiscoverAppState,
    }),
    [
      resetDiscoverAppState,
      restoreDiscoverAppStateFromSavedSearch,
      updateSavedSearch,
      getAppStateFromSavedSearch,
      getDefaultDiscoverAppState,
    ]
  );

  return actions;
};
