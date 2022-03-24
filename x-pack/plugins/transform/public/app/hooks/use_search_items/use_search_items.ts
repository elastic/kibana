/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { isDataView } from '../../../../common/types/data_view';

import { getSavedSearch, getSavedSearchUrlConflictMessage } from '../../../shared_imports';

import { useAppDependencies } from '../../app_dependencies';

import {
  createSearchItems,
  getDataViewIdByTitle,
  loadCurrentDataView,
  loadDataViews,
  SearchItems,
} from './common';

export const useSearchItems = (defaultSavedObjectId: string | undefined) => {
  const [savedObjectId, setSavedObjectId] = useState(defaultSavedObjectId);
  const [error, setError] = useState<string | undefined>();

  const appDeps = useAppDependencies();
  const dataViews = appDeps.data.dataViews;
  const uiSettings = appDeps.uiSettings;
  const savedObjectsClient = appDeps.savedObjects.client;

  const [searchItems, setSearchItems] = useState<SearchItems | undefined>(undefined);

  async function fetchSavedObject(id: string) {
    await loadDataViews(savedObjectsClient, dataViews);

    let fetchedDataView;
    let fetchedSavedSearch;

    try {
      fetchedDataView = await loadCurrentDataView(dataViews, id);
    } catch (e) {
      // Just let fetchedDataView stay undefined in case it doesn't exist.
    }

    try {
      fetchedSavedSearch = await getSavedSearch(id, {
        search: appDeps.data.search,
        savedObjectsClient: appDeps.savedObjects.client,
        spaces: appDeps.spaces,
      });

      if (fetchedSavedSearch?.sharingSavedObjectProps?.errorJSON) {
        setError(await getSavedSearchUrlConflictMessage(fetchedSavedSearch));
        return;
      }
    } catch (e) {
      // Just let fetchedSavedSearch stay undefined in case it doesn't exist.
    }

    if (!isDataView(fetchedDataView) && fetchedSavedSearch === undefined) {
      setError(
        i18n.translate('xpack.transform.searchItems.errorInitializationTitle', {
          defaultMessage: `An error occurred initializing the Kibana data view or saved search.`,
        })
      );
      return;
    }

    setSearchItems(createSearchItems(fetchedDataView, fetchedSavedSearch, uiSettings));
    setError(undefined);
  }

  useEffect(() => {
    if (savedObjectId !== undefined) {
      fetchSavedObject(savedObjectId);
    }
    // Run this only when savedObjectId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedObjectId]);

  return {
    error,
    getDataViewIdByTitle,
    loadDataViews,
    searchItems,
    setSavedObjectId,
  };
};
