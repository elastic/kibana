/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import { useListsIndex } from './use_lists_index';

export interface UseListsConfigState {
  needsConfiguration: boolean | null;
}

export interface UseListsConfigReturn extends UseListsConfigState {
  loading: boolean;
}

export const useListsConfig = (): UseListsConfigReturn => {
  const { loading, indexExists, createIndex } = useListsIndex();
  const needsConfiguration = indexExists === false;

  const isAuthenticated = true; // TODO check user's authentication
  const canManageIndex = true; // TODO check user's list index privileges

  useEffect(() => {
    if (isAuthenticated && canManageIndex && needsConfiguration) {
      createIndex();
    }
  }, [canManageIndex, createIndex, needsConfiguration, isAuthenticated]);

  return { loading, needsConfiguration };
};
