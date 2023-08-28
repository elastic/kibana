/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import type { SaveSavedSearchOptions } from '@kbn/saved-search-plugin/public';
import type { RefObject } from 'react';
import React, { useCallback } from 'react';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useKibana } from '../../lib/kibana';
import { SaveSearchObjectModal } from './save_search_modal';

export const useDiscoverInTimelineActions = (
  discoverStateContainer: RefObject<DiscoverStateContainer | undefined>
) => {
  const { addSuccess, addError } = useAppToasts();

  const {
    services: { savedObjectsTagging },
  } = useKibana();

  const saveDataSource = useCallback(
    async (
      savedSearchOption: SaveSavedSearchOptions,
      override: { title: string; description: string }
    ) => {
      if (!discoverStateContainer) {
        // eslint-disable-next-line no-console
        console.log(`Saved search is no-open since state container is null`);
        return;
      }
      const savedSearch = discoverStateContainer.current?.savedSearchState.getState();
      if (!savedSearch) return;
      const currentTitle = savedSearch?.title;
      const currentDescription = savedSearch?.description;

      savedSearch.title = override.title;
      savedSearch.description = override.description;

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
        if (savedSearch) {
          savedSearch.title = currentTitle;
          savedSearch.description = currentDescription;
        }
        addError(error, { title: 'Error while saving saved Search' });
      }

      try {
        const response = await discoverStateContainer.current?.savedSearchState.persist(
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

  const saveCurrentSearch = useCallback(
    async ({ name, description }: { name: string; description: string }) => {
      debugger;
      if (!discoverStateContainer) return;
      const savedSearch = discoverStateContainer.current?.savedSearchState.getState();
      if (!savedSearch) return;
      const dataView = discoverStateContainer.current?.internalState.getState().dataView;

      const onTitleDuplicate = () => {
        const errMsg = 'Cannot Save. Duplicate Saved Search Found.';
        const duplicateError = new Error(errMsg);
        addError(duplicateError, { title: 'Duplicate Save Search Error' });
        throw new Error(errMsg);
      };

      discoverStateContainer.current?.actions.updateAdHocDataViewId();

      const response = await saveDataSource(
        {
          onTitleDuplicate,
          copyOnSave: true,
        },
        {
          title: name,
          description,
        }
      );

      return response;
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
          discoverStateContainer.current?.actions.updateAdHocDataViewId();
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
    },
    [discoverStateContainer, saveDataSource, savedObjectsTagging, addError]
  );

  return {
    saveDataSource,
    saveCurrentSearch,
  };
};
