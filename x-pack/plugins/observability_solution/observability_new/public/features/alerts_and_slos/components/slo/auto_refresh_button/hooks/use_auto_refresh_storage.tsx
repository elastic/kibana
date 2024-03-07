/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const AUTO_REFRESH_STORAGE_KEY = 'slo.auto_refresh';

export function useAutoRefreshStorage(): {
  storeAutoRefreshState: (newValue: boolean) => void;
  getAutoRefreshState: () => boolean;
} {
  if (!localStorage) {
    return { storeAutoRefreshState: () => {}, getAutoRefreshState: () => true };
  }

  return {
    storeAutoRefreshState: (newValue: boolean) => {
      localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, JSON.stringify(newValue));
    },

    getAutoRefreshState: () => {
      const value = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
      if (value === null) return true;

      return Boolean(JSON.parse(value));
    },
  };
}
