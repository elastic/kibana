/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { RecursiveReadonly } from '@kbn/utility-types';

export interface UseGetUserAlertsPermissionsProps {
  crud: boolean;
  read: boolean;
  loading: boolean;
  featureId: string | null;
}

export const useGetUserAlertsPermissions = (
  uiCapabilities: RecursiveReadonly<Record<string, any>>,
  featureId?: string
): UseGetUserAlertsPermissionsProps => {
  const [alertsPermissions, setAlertsPermissions] = useState<UseGetUserAlertsPermissionsProps>({
    crud: false,
    read: false,
    loading: true,
    featureId: null,
  });

  useEffect(() => {
    if (!featureId || !uiCapabilities[featureId]) {
      setAlertsPermissions({
        crud: false,
        read: false,
        loading: false,
        featureId: null,
      });
    } else {
      setAlertsPermissions((currentAlertPermissions) => {
        if (currentAlertPermissions.featureId === featureId) {
          return currentAlertPermissions;
        }
        const capabilitiesCanUserCRUD: boolean =
          typeof uiCapabilities[featureId].save === 'boolean'
            ? uiCapabilities[featureId].save
            : false;
        const capabilitiesCanUserRead: boolean =
          typeof uiCapabilities[featureId].show === 'boolean'
            ? uiCapabilities[featureId].show
            : false;
        return {
          crud: capabilitiesCanUserCRUD,
          read: capabilitiesCanUserRead,
          loading: false,
          featureId,
        };
      });
    }
  }, [alertsPermissions.featureId, featureId, uiCapabilities]);

  return alertsPermissions;
};
