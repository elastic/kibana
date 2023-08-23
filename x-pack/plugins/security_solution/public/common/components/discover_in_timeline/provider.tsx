/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { SaveSavedSearchOptions } from '@kbn/saved-search-plugin/public';
import type { PropsWithChildren, FC } from 'react';
import React, { useCallback, useRef } from 'react';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { DiscoverInTimelineContext } from './context';

type DiscoverInTimelineContextProviderProps = PropsWithChildren<{}>;

export const DiscoverInTimelineContextProvider: FC<DiscoverInTimelineContextProviderProps> = (
  props
) => {
  const discoverStateContainer = useRef<DiscoverStateContainer>();

  const setDiscoverStateContainer = useCallback((stateContainer: DiscoverStateContainer) => {
    discoverStateContainer.current = stateContainer;
  }, []);

  const { api, addSuccess, addError } = useAppToasts();

  const saveCurrentSearch = useCallback(() => {
    if (!discoverStateContainer.current) return;
    const savedSearch = discoverStateContainer.current.savedSearchState.getState();
    if (!savedSearch) return;
    const { title, timeRestore, rowsPerPage, description } = savedSearch;

    const onSave = async ({
      newTitle,
      newCopyOnSave,
      newTimeRestore,
      newDescription,
      newTags,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    }: {
      newTitle: string;
      newTimeRestore: boolean;
      newCopyOnSave: boolean;
      newDescription: string;
      newTags: string[];
      isTitleDuplicateConfirmed: boolean;
      onTitleDuplicate: () => void;
    }) => {
      const currentTitle = savedSearch.title;
      const currentTimeRestore = savedSearch.timeRestore;
      const currentRowsPerPage = savedSearch.rowsPerPage;
      const currentDescription = savedSearch.description;
      const currentTags = savedSearch.tags;
      savedSearch.title = newTitle;
      savedSearch.description = newDescription;
      savedSearch.timeRestore = newTimeRestore;
      savedSearch.rowsPerPage = currentRowsPerPage;
      // if (savedObjectsTagging) {
      //   savedSearch.tags = newTags;
      // }
      const saveOptions: SaveSavedSearchOptions = {
        onTitleDuplicate,
        copyOnSave: newCopyOnSave,
        isTitleDuplicateConfirmed,
      };

      if (newCopyOnSave) {
        await discoverStateContainer.current.actions.updateAdHocDataViewId();
      }
      const navigateOrReloadSavedSearch = true;
      const response = await saveDataSource({
        saveOptions,
        services,
        savedSearch,
        state,
        navigateOrReloadSavedSearch,
      });
      // If the save wasn't successful, put the original values back.
      if (!response) {
        savedSearch.title = currentTitle;
        savedSearch.timeRestore = currentTimeRestore;
        savedSearch.rowsPerPage = currentRowsPerPage;
        savedSearch.description = currentDescription;
        if (savedObjectsTagging) {
          savedSearch.tags = currentTags;
        }
      } else {
        state.appState.resetInitialState();
      }
      onSaveCb?.();
      return response;
    };
  });

  const saveDataSource = useCallback(
    async (savedSearchOption: SaveSavedSearchOptions) => {
      if (!discoverStateContainer.current) return;
      const savedSearch = discoverStateContainer.current.savedSearchState.getState();
      if (!savedSearch) return;

      function onSuccess(id: string) {
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
        const response = await discoverStateContainer.current.savedSearchState.persist(
          savedSearch,
          savedSearchOption
        );
        if (response?.id) {
          onSuccess(response?.id);
        }
      } catch (err) {
        onError(err);
      }
    },
    [addSuccess, addError]
  );

  return (
    <DiscoverInTimelineContext.Provider
      value={{
        discoverStateContainer: discoverStateContainer.current,
        setDiscoverStateContainer,
      }}
    >
      {props.children}
    </DiscoverInTimelineContext.Provider>
  );
};
