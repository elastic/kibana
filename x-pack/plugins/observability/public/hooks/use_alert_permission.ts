/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { RecursiveReadonly } from '@kbn/utility-types';
import { Capabilities } from '@kbn/core/types';

export interface UseGetUserAlertsPermissionsProps {
  crud: boolean;
  read: boolean;
  loading?: boolean;
  featureId: string | null;
}

export const getAlertsPermissions = (
  uiCapabilities: RecursiveReadonly<Capabilities>,
  featureId: string
) => {
  if (!featureId || !uiCapabilities[featureId]) {
    return {
      crud: false,
      read: false,
      loading: false,
      featureId,
    };
  }

  return {
    crud: (featureId === 'apm'
      ? uiCapabilities[featureId]['alerting:save']
      : uiCapabilities[featureId].save) as boolean,
    read: (featureId === 'apm'
      ? uiCapabilities[featureId]['alerting:show']
      : uiCapabilities[featureId].show) as boolean,
    loading: false,
    featureId,
  };
};

export const useGetUserAlertsPermissions = (
  uiCapabilities: RecursiveReadonly<Capabilities>,
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
        return getAlertsPermissions(uiCapabilities, featureId);
      });
    }
  }, [alertsPermissions.featureId, featureId, uiCapabilities]);

  return alertsPermissions;
};
