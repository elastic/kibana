/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import type { Privilege } from '../alerts/types';

export interface UseListsPrivilegesState {
  isAuthenticated: boolean | null;
  canManageIndex: boolean | null;
  canReadIndex: boolean | null;
  canWriteIndex: boolean | null;
}

export interface UseListsPrivilegesReturn extends UseListsPrivilegesState {
  loading: boolean;
}

const canManageIndex = (indexPrivileges: Privilege['index']): boolean => {
  const [indexName] = Object.keys(indexPrivileges);
  const privileges = indexPrivileges[indexName];
  if (privileges == null) {
    return false;
  }
  return privileges.manage;
};

const canReadIndex = (indexPrivileges: Privilege['index']): boolean => {
  const [indexName] = Object.keys(indexPrivileges);
  const privileges = indexPrivileges[indexName];
  if (privileges == null) {
    return false;
  }

  return privileges.read;
};

const canWriteIndex = (indexPrivileges: Privilege['index']): boolean => {
  const [indexName] = Object.keys(indexPrivileges);
  const privileges = indexPrivileges[indexName];
  if (privileges == null) {
    return false;
  }

  return privileges.create || privileges.create_doc || privileges.index || privileges.write;
};

export const useListsPrivileges = (): UseListsPrivilegesReturn => {
  const [state, setState] = useState<UseListsPrivilegesState>({
    isAuthenticated: null,
    canManageIndex: null,
    canReadIndex: null,
    canWriteIndex: null,
  });

  const { listPrivileges } = useUserPrivileges();

  // handleReadResult
  useEffect(() => {
    if (listPrivileges.result != null) {
      const {
        is_authenticated: isAuthenticated,
        lists: { index: listsPrivileges },
        listItems: { index: listItemsPrivileges },
      } = listPrivileges.result;

      setState({
        isAuthenticated,
        canReadIndex: canReadIndex(listsPrivileges) && canReadIndex(listItemsPrivileges),
        canManageIndex: canManageIndex(listsPrivileges) && canManageIndex(listItemsPrivileges),
        canWriteIndex: canWriteIndex(listsPrivileges) && canWriteIndex(listItemsPrivileges),
      });
    }
  }, [listPrivileges.result]);

  // handleReadError
  useEffect(() => {
    if (listPrivileges.error != null) {
      setState({
        isAuthenticated: false,
        canManageIndex: false,
        canReadIndex: false,
        canWriteIndex: false,
      });
    }
  }, [listPrivileges.error]);

  return { loading: listPrivileges.loading, ...state };
};
