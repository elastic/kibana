/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

import { getUserPrivilege } from './api';
import * as i18n from './translations';

export interface ReturnPrivilegeUser {
  loading: boolean;
  isAuthenticated: boolean | null;
  hasEncryptionKey: boolean | null;
  hasIndexManage: boolean | null;
  hasIndexWrite: boolean | null;
  hasIndexUpdateDelete: boolean | null;
  hasIndexMaintenance: boolean | null;
}
/**
 * Hook to get user privilege from
 *
 */
export const usePrivilegeUser = (): ReturnPrivilegeUser => {
  const [loading, setLoading] = useState(true);
  const [privilegeUser, setPrivilegeUser] = useState<
    Pick<
      ReturnPrivilegeUser,
      | 'isAuthenticated'
      | 'hasEncryptionKey'
      | 'hasIndexManage'
      | 'hasIndexWrite'
      | 'hasIndexUpdateDelete'
      | 'hasIndexMaintenance'
    >
  >({
    isAuthenticated: null,
    hasEncryptionKey: null,
    hasIndexManage: null,
    hasIndexWrite: null,
    hasIndexUpdateDelete: null,
    hasIndexMaintenance: null,
  });
  const { addError } = useAppToasts();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    const fetchData = async () => {
      try {
        const privilege = await getUserPrivilege({
          signal: abortCtrl.signal,
        });

        if (isSubscribed && privilege != null) {
          if (privilege.index != null && Object.keys(privilege.index).length > 0) {
            const indexName = Object.keys(privilege.index)[0];
            setPrivilegeUser({
              isAuthenticated: privilege.is_authenticated,
              hasEncryptionKey: privilege.has_encryption_key,
              hasIndexManage: privilege.index[indexName].manage && privilege.cluster.manage,
              hasIndexMaintenance: privilege.index[indexName].maintenance,
              hasIndexWrite:
                privilege.index[indexName].create ||
                privilege.index[indexName].create_doc ||
                privilege.index[indexName].index ||
                privilege.index[indexName].write,
              hasIndexUpdateDelete: privilege.index[indexName].write,
            });
          }
        }
      } catch (error) {
        if (isSubscribed) {
          setPrivilegeUser({
            isAuthenticated: false,
            hasEncryptionKey: false,
            hasIndexManage: false,
            hasIndexWrite: false,
            hasIndexUpdateDelete: false,
            hasIndexMaintenance: false,
          });
          addError(error, { title: i18n.PRIVILEGE_FETCH_FAILURE });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [addError]);

  return { loading, ...privilegeUser };
};
