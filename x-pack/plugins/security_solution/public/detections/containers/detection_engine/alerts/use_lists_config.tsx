/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import { useListsIndex } from './use_lists_index';
import { useListsPrivileges } from './use_lists_privileges';

export interface UseListsConfigState {
  needsConfiguration: boolean | null;
}

export interface UseListsConfigReturn extends UseListsConfigState {
  loading: boolean;
}

export const useListsConfig = (): UseListsConfigReturn => {
  const { loading: indexLoading, indexExists, createIndex } = useListsIndex();
  const { loading: privilegesLoading, canManageIndex, isAuthenticated } = useListsPrivileges();
  const loading = indexLoading || privilegesLoading;
  const needsConfiguration = indexExists === false;

  useEffect(() => {
    if (isAuthenticated && canManageIndex && needsConfiguration) {
      createIndex();
    }
  }, [canManageIndex, createIndex, needsConfiguration, isAuthenticated]);

  return { loading, needsConfiguration };
};
