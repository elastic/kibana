/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isDataView } from '../../../../common/types/data_view';
import { useAppDependencies } from '../../app_dependencies';
import type { SearchItems } from './common';
import { createSearchItems, getDataViewIdByTitle, loadDataViews } from './common';

export const useSearchItems = (defaultSavedObjectId: string | undefined) => {
  const [savedObjectId, setSavedObjectId] = useState(defaultSavedObjectId);
  const [error, setError] = useState<string | undefined>();

  const appDeps = useAppDependencies();
  const dataViewsContract = appDeps.data.dataViews;
  const uiSettings = appDeps.uiSettings;

  const [searchItems, setSearchItems] = useState<SearchItems | undefined>(undefined);

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  async function fetchSavedObject(id: string) {
    let fetchedDataView;
    let fetchedSavedSearch;

    try {
      fetchedDataView = await dataViewsContract.get(id);
    } catch (e) {
      // Just let fetchedDataView stay undefined in case it doesn't exist.
    }

    try {
      // If data view already found, no need to get saved search
      if (!fetchedDataView) {
        fetchedSavedSearch = await appDeps.savedSearch.get(id);
      }
    } catch (e) {
      // Just let fetchedSavedSearch stay undefined in case it doesn't exist.
    }

    if (isMounted.current) {
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
