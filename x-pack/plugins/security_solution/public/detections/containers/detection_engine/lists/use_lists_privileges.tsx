/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useCallback } from 'react';

import { useReadListPrivileges } from '../../../../shared_imports';
import { useHttp, useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

export interface UseListsPrivilegesState {
  isAuthenticated: boolean | null;
  canManageIndex: boolean | null;
  canWriteIndex: boolean | null;
}

export interface UseListsPrivilegesReturn extends UseListsPrivilegesState {
  loading: boolean;
}

interface ListIndexPrivileges {
  [indexName: string]: {
    all: boolean;
    create: boolean;
    create_doc: boolean;
    create_index: boolean;
    delete: boolean;
    delete_index: boolean;
    index: boolean;
    manage: boolean;
    manage_follow_index: boolean;
    manage_ilm: boolean;
    manage_leader_index: boolean;
    monitor: boolean;
    read: boolean;
    read_cross_cluster: boolean;
    view_index_metadata: boolean;
    write: boolean;
  };
}

interface ListPrivileges {
  is_authenticated: boolean;
  lists: {
    index: ListIndexPrivileges;
  };
  listItems: {
    index: ListIndexPrivileges;
  };
}

const canManageIndex = (indexPrivileges: ListIndexPrivileges): boolean => {
  const [indexName] = Object.keys(indexPrivileges);
  const privileges = indexPrivileges[indexName];
  if (privileges == null) {
    return false;
  }
  return privileges.manage;
};

const canWriteIndex = (indexPrivileges: ListIndexPrivileges): boolean => {
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
    canWriteIndex: null,
  });
  const { lists } = useKibana().services;
  const http = useHttp();
  const { addError } = useAppToasts();
  const { loading, start: readListPrivileges, ...readState } = useReadListPrivileges();

  const readPrivileges = useCallback(() => {
    if (lists) {
      readListPrivileges({ http });
    }
  }, [http, lists, readListPrivileges]);

  // initRead
  useEffect(() => {
    if (!loading && !readState.error && state.isAuthenticated === null) {
      readPrivileges();
    }
  }, [loading, readState.error, readPrivileges, state.isAuthenticated]);

  // handleReadResult
  useEffect(() => {
    if (readState.result != null) {
      try {
        const {
          is_authenticated: isAuthenticated,
          lists: { index: listsPrivileges },
          listItems: { index: listItemsPrivileges },
        } = readState.result as ListPrivileges;

        setState({
          isAuthenticated,
          canManageIndex: canManageIndex(listsPrivileges) && canManageIndex(listItemsPrivileges),
          canWriteIndex: canWriteIndex(listsPrivileges) && canWriteIndex(listItemsPrivileges),
        });
      } catch (e) {
        setState({ isAuthenticated: null, canManageIndex: false, canWriteIndex: false });
      }
    }
  }, [readState.result]);

  // handleReadError
  useEffect(() => {
    const error = readState.error;
    if (error != null) {
      setState({ isAuthenticated: false, canManageIndex: false, canWriteIndex: false });
      addError(error, {
        title: i18n.LISTS_PRIVILEGES_READ_FAILURE,
      });
    }
  }, [addError, readState.error]);

  return { loading, ...state };
};
