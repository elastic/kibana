/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import { useKibana } from '../../../../common/lib/kibana';
import { useListsIndex } from './use_lists_index';
import { useListsPrivileges } from './use_lists_privileges';

export interface UseListsConfigReturn {
  canManageIndex: boolean | null;
  canWriteIndex: boolean | null;
  enabled: boolean;
  loading: boolean;
  needsConfiguration: boolean;
}

export const useListsConfig = (): UseListsConfigReturn => {
  const { createIndex, indexExists, loading: indexLoading, error: indexError } = useListsIndex();
  const { canManageIndex, canWriteIndex, loading: privilegesLoading } = useListsPrivileges();
  const { lists } = useKibana().services;

  const enabled = lists != null;
  const loading = indexLoading || privilegesLoading;
  const needsIndex = indexExists === false;
  const hasIndexError = indexError != null;
  const needsIndexConfiguration =
    needsIndex && (canManageIndex === false || (canManageIndex === true && hasIndexError));
  const needsConfiguration = !enabled || needsIndexConfiguration;

  useEffect(() => {
    if (needsIndex && canManageIndex) {
      createIndex();
    }
  }, [canManageIndex, createIndex, needsIndex]);

  return { canManageIndex, canWriteIndex, enabled, loading, needsConfiguration };
};
