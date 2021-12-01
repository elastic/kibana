/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { isIndexPattern } from '../../../../common/types/index_pattern';

import { getSavedSearch, getSavedSearchUrlConflictMessage } from '../../../shared_imports';

import { useAppDependencies } from '../../app_dependencies';

import {
  createSearchItems,
  getIndexPatternIdByTitle,
  loadCurrentIndexPattern,
  loadIndexPatterns,
  SearchItems,
} from './common';

export const useSearchItems = (defaultSavedObjectId: string | undefined) => {
  const [savedObjectId, setSavedObjectId] = useState(defaultSavedObjectId);
  const [error, setError] = useState<string | undefined>();

  const appDeps = useAppDependencies();
  const indexPatterns = appDeps.data.indexPatterns;
  const uiSettings = appDeps.uiSettings;
  const savedObjectsClient = appDeps.savedObjects.client;

  const [searchItems, setSearchItems] = useState<SearchItems | undefined>(undefined);

  async function fetchSavedObject(id: string) {
    await loadIndexPatterns(savedObjectsClient, indexPatterns);

    let fetchedIndexPattern;
    let fetchedSavedSearch;

    try {
      fetchedIndexPattern = await loadCurrentIndexPattern(indexPatterns, id);
    } catch (e) {
      // Just let fetchedIndexPattern stay undefined in case it doesn't exist.
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

    if (!isIndexPattern(fetchedIndexPattern) && fetchedSavedSearch === undefined) {
      setError(
        i18n.translate('xpack.transform.searchItems.errorInitializationTitle', {
          defaultMessage: `An error occurred initializing the Kibana data view or saved search.`,
        })
      );
      return;
    }

    setSearchItems(createSearchItems(fetchedIndexPattern, fetchedSavedSearch, uiSettings));
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
    getIndexPatternIdByTitle,
    loadIndexPatterns,
    searchItems,
    setSavedObjectId,
  };
};
