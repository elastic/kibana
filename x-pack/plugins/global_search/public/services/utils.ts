/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';

const defaultPrefStorageKey = 'globalSearch:defaultPref';

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
