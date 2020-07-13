/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import { useListsIndex } from './use_lists_index';
import { useListsPrivileges } from './use_lists_privileges';

export interface UseListsConfigReturn {
  canManageIndex: boolean | null;
  canWriteIndex: boolean | null;
  loading: boolean;
  needsConfiguration: boolean | null;
}

export const useListsConfig = (): UseListsConfigReturn => {
  const { createIndex, indexExists, loading: indexLoading } = useListsIndex();
  const { canManageIndex, canWriteIndex, loading: privilegesLoading } = useListsPrivileges();
  const loading = indexLoading || privilegesLoading;
  const needsConfiguration = indexExists === false;

  useEffect(() => {
    if (canManageIndex && needsConfiguration) {
      createIndex();
    }
  }, [canManageIndex, createIndex, needsConfiguration]);

  return { canManageIndex, canWriteIndex, loading, needsConfiguration };
};
