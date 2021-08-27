/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

export interface UseAlertsPrivelegesReturn extends AlertsPrivelegesState {
  loading: boolean;
}

export interface AlertsPrivelegesState {
  isAuthenticated: boolean | null;
  hasEncryptionKey: boolean | null;
  hasIndexManage: boolean | null;
  hasIndexWrite: boolean | null;
  hasIndexUpdateDelete: boolean | null;
  hasIndexMaintenance: boolean | null;
  hasIndexRead: boolean | null;
}
/**
 * Hook to get user privilege from
 *
 */
export const useAlertsPrivileges = (): UseAlertsPrivelegesReturn => {
  const [privileges, setPrivileges] = useState<AlertsPrivelegesState>({
    isAuthenticated: null,
    hasEncryptionKey: null,
    hasIndexManage: null,
    hasIndexRead: null,
    hasIndexWrite: null,
    hasIndexUpdateDelete: null,
    hasIndexMaintenance: null,
  });
  const { detectionEnginePrivileges, alertsPrivileges } = useUserPrivileges();

  useEffect(() => {
    if (detectionEnginePrivileges.error != null) {
      setPrivileges({
        isAuthenticated: false,
        hasEncryptionKey: false,
        hasIndexManage: false,
        hasIndexRead: false,
        hasIndexWrite: false,
        hasIndexUpdateDelete: false,
        hasIndexMaintenance: false,
      });
    }
  }, [detectionEnginePrivileges.error]);

  useEffect(() => {
    if (detectionEnginePrivileges.result != null) {
      const privilege = detectionEnginePrivileges.result;

      if (privilege.index != null && Object.keys(privilege.index).length > 0) {
        const indexName = Object.keys(privilege.index)[0];
        setPrivileges({
          isAuthenticated: privilege.is_authenticated,
          hasEncryptionKey: privilege.has_encryption_key,
          hasIndexManage: privilege.index[indexName].manage && privilege.cluster.manage,
          hasIndexMaintenance: privilege.index[indexName].maintenance,
          hasIndexRead: alertsPrivileges.read,
          hasIndexWrite: alertsPrivileges.crud,
          hasIndexUpdateDelete: privilege.index[indexName].write,
        });
      }
    }
  }, [detectionEnginePrivileges.result, alertsPrivileges]);

  return { loading: detectionEnginePrivileges.loading, ...privileges };
};
