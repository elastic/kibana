/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { createSavedSearchesLoader } from '../../../shared_imports';

import { useAppDependencies } from '../../app_dependencies';

import {
  createSearchItems,
  getIndexPatternIdByTitle,
  loadCurrentIndexPattern,
  loadIndexPatterns,
  loadCurrentSavedSearch,
  SearchItems,
} from './common';

export const useSearchItems = (defaultSavedObjectId: string | undefined) => {
  const [savedObjectId, setSavedObjectId] = useState(defaultSavedObjectId);

  const appDeps = useAppDependencies();
  const indexPatterns = appDeps.data.indexPatterns;
  const uiSettings = appDeps.uiSettings;
  const savedObjectsClient = appDeps.savedObjects.client;
  const savedSearches = createSavedSearchesLoader({
    savedObjectsClient,
    savedObjects: appDeps.savedObjectsPlugin,
  });

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
      fetchedSavedSearch = await loadCurrentSavedSearch(savedSearches, id);
    } catch (e) {
      // Just let fetchedSavedSearch stay undefined in case it doesn't exist.
    }

    setSearchItems(createSearchItems(fetchedIndexPattern, fetchedSavedSearch, uiSettings));
  }

  useEffect(() => {
    if (savedObjectId !== undefined) {
      fetchSavedObject(savedObjectId);
    }
    // Run this only when savedObjectId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedObjectId]);

  return {
    getIndexPatternIdByTitle,
    loadIndexPatterns,
    searchItems,
    setSavedObjectId,
  };
};
