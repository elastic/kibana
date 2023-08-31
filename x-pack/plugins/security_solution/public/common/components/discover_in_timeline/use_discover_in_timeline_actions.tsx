/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { SaveSavedSearchOptions } from '@kbn/saved-search-plugin/public';
import type { RefObject } from 'react';
import { useEffect } from 'react';
import { useMemo } from 'react';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { useDiscoverState } from '../../../timelines/components/timeline/discover_tab_content/use_discover_state';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { TimelineId } from '../../../../common/types';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { useKibana } from '../../lib/kibana';

export const useDiscoverInTimelineActions = (
  discoverStateContainer: RefObject<DiscoverStateContainer | undefined>
) => {
  const { addSuccess, addError } = useAppToasts();

  const {
    services: {
      savedObjectsTagging,
      customDataService: discoverDataService,
      savedSearch: savedSearchService,
    },
  } = useKibana();

  const { discoverSavedSearchState } = useDiscoverState();

  const dispatch = useDispatch();

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const timeline = useShallowEqualSelector(
    (state) => getTimeline(state, TimelineId.active) ?? timelineDefaults
  );

  const { status, title, description, savedSearchId, updated, savedObjectId } = timeline;

  console.log({
    status,
    title,
    description,
    savedSearchId,
    updated,
  });
  useEffect(() => {
    console.log('Discover State Container Changed');
  }, [discoverStateContainer]);

  const getAppStateFromSavedSearchId = async (newSavedSearchId: string) => {
    const savedSearch = await savedSearchService.get(newSavedSearchId);
    discoverStateContainer.current?.savedSearchState.load(newSavedSearchId);
    if (!savedSearchId) return;
    const appState =
      discoverStateContainer.current?.appState.getAppStateFromSavedSearch(savedSearch);
    return {
      savedSearch,
      appState,
    };
  };

  const restoreDiscoverSavedSearch = useCallback(
    async (newSavedSearchId: string) => {
      try {
        await discoverStateContainer.current?.actions.loadSavedSearch({
          savedSearchId: newSavedSearchId,
        });
      } catch (err) {
        addError(err, {
          title: 'Failed to load Discover Saved Search. Discover state will be reset',
        });
      }
    },
    [addError, discoverStateContainer]
  );

  const resetDiscoverState = useCallback(() => {
    discoverStateContainer.current?.appState.resetInitialState();
  }, [discoverStateContainer]);

  const persistSavedSearch = useCallback(
    async (savedSearch: SavedSearch, savedSearchOption: SaveSavedSearchOptions) => {
      if (!discoverStateContainer) {
        // eslint-disable-next-line no-console
        console.log(`Saved search is not open since state container is null`);
        return;
      }
      if (!savedSearch) return;

      function onSuccess(id: string) {
        if (!savedSearch) return;
        if (id) {
          addSuccess({
            title: `Saved new Search ${savedSearch.title}`,
          });
        }
      }

      function onError(error: Error) {
        addError(error, { title: 'Error while saving saved Search' });
      }

      try {
        const id = await savedSearchService.save(savedSearch, savedSearchOption);
        if (id) {
          onSuccess(id);
        }
        return { id };
      } catch (err) {
        onError(err);
      }
    },
    [addSuccess, addError, discoverStateContainer, savedSearchService]
  );

  const updateSavedSearch = useCallback(
    async (savedSearch: SavedSearch) => {
      savedSearch.title = `Saved Search for timeline - ${title} `;
      savedSearch.description = description;
      savedSearch.timeRestore = true;

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
        }
      } catch (err) {
        addError('Error saving Discover Saved Search', {
          title: 'Error saving Discover Saved Search',
          toastMessage: String(err),
        });
      }
    },
    [title, description, persistSavedSearch, savedSearchId, addError, dispatch]
  );

  useEffect(() => {
    if (
      !discoverStateContainer.current ||
      !discoverSavedSearchState ||
      status === 'draft' ||
      !title ||
      !discoverStateContainer.current.appState.hasChanged()
    )
      return;

    const newSavedSearch = discoverStateContainer.current?.savedSearchState.getState();
    if (!newSavedSearch) return;
    updateSavedSearch(newSavedSearch);
  }, [discoverSavedSearchState, updateSavedSearch, status, title, discoverStateContainer]);

  return {
    saveDataSource: persistSavedSearch,
    resetDiscoverState,
    restoreDiscoverSavedSearch,
    updateSavedSearch,
    getAppStateFromSavedSearchId,
  };
};
