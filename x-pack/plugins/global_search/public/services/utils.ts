/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { ApplicationStart } from 'src/core/public';
import { GlobalSearchResult } from '../../common/types';
import { NavigableGlobalSearchResult } from './types';

const defaultPrefStorageKey = 'globalSearch:defaultPref';

/**
 * Add the `navigate` method to a {@link GlobalSearchResult | result}.
 */
export const addNavigate = (
  result: GlobalSearchResult,
  navigateToUrl: ApplicationStart['navigateToUrl']
): NavigableGlobalSearchResult => {
  return {
    ...result,
    navigate: () => navigateToUrl(result.url),
  };
};

/**
 * Returns the default {@link GlobalSearchFindOptions.preference | preference} value.
 *
 * The implementation is based on the sessionStorage, which ensure the default value for a session/tab will remain the same.
 */
export const getDefaultPreference = (storage: Storage = window.sessionStorage): string => {
  let pref = storage.getItem(defaultPrefStorageKey);
  if (pref) {
    return pref;
  }
  pref = uuid.v4();
  storage.setItem(defaultPrefStorageKey, pref);
  return pref;
};
