/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import type { SaveSavedSearchOptions } from '@kbn/saved-search-plugin/public';
import React, { useCallback } from 'react';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useKibana } from '../../lib/kibana';
import { SaveSearchObjectModal } from './save_search_modal';

export const useDiscoverInTimelineActions = (
  discoverStateContainer: DiscoverStateContainer | undefined
) => {
  const { api, addSuccess, addError } = useAppToasts();

  const { savedObjectsTagging } = useKibana();

  const saveDataSource = useCallback(
    async (savedSearchOption: SaveSavedSearchOptions) => {
      if (!discoverStateContainer) {
        console.log(`Saved search is no-open since state container is null`);
        return;
      }
      const savedSearch = discoverStateContainer.savedSearchState.getState();
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
        const response = await discoverStateContainer.savedSearchState.persist(
          savedSearch,
          savedSearchOption
        );
        if (response?.id) {
          onSuccess(response?.id);
        }
        return response;
      } catch (err) {
        onError(err);
      }
    },
    [addSuccess, addError, discoverStateContainer]
  );

  const saveCurrentSearch = useCallback(() => {
    if (!discoverStateContainer) return;
    const savedSearch = discoverStateContainer.savedSearchState.getState();
    if (!savedSearch) return;
    const dataView = discoverStateContainer?.internalState.getState().dataView;
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
        await discoverStateContainer?.actions.updateAdHocDataViewId();
      }
      const response = await saveDataSource(saveOptions);
      // If the save wasn't successful, put the original values back.
      // if (!response) {
      //   savedSearch.title = currentTitle;
      //   savedSearch.timeRestore = currentTimeRestore;
      //   savedSearch.rowsPerPage = currentRowsPerPage;
      //   savedSearch.description = currentDescription;
      //   if (savedObjectsTagging) {
      //     savedSearch.tags = currentTags;
      //   }
      // } else {
      //   discoverStateContainer?.appState.resetInitialState();
      // }
      return response;
    };

    const saveModal = (
      <SaveSearchObjectModal
        isTimeBased={dataView?.isTimeBased() ?? false}
        savedObjectsTagging={savedObjectsTagging}
        title={savedSearch.title ?? ''}
        showCopyOnSave={!!savedSearch.id}
        description={savedSearch.description}
        timeRestore={savedSearch.timeRestore}
        tags={savedSearch.tags ?? []}
        onSave={onSave}
        onClose={() => {}}
      />
    );
    showSaveModal(saveModal);
  }, [discoverStateContainer, saveDataSource, savedObjectsTagging]);

  return {
    saveDataSource,
    saveCurrentSearch,
  };
};
