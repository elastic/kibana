/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { getUserPrivilege } from './api';
import * as i18n from './translations';

export interface ReturnPrivilegeUser {
  loading: boolean;
  isAuthenticated: boolean | null;
  hasEncryptionKey: boolean | null;
  hasIndexManage: boolean | null;
  hasIndexWrite: boolean | null;
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
      'isAuthenticated' | 'hasEncryptionKey' | 'hasIndexManage' | 'hasIndexWrite'
    >
  >({
    isAuthenticated: null,
    hasEncryptionKey: null,
    hasIndexManage: null,
    hasIndexWrite: null,
  });
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchData() {
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
              hasIndexManage: privilege.index[indexName].manage,
              hasIndexWrite:
                privilege.index[indexName].create ||
                privilege.index[indexName].create_doc ||
                privilege.index[indexName].index ||
                privilege.index[indexName].write,
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
          });
          errorToToaster({ title: i18n.PRIVILEGE_FETCH_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, ...privilegeUser };
};
