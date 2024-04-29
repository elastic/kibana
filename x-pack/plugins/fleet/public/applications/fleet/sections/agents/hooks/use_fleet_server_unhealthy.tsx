/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEffect, useCallback, useState } from 'react';

import { sendGetEnrollmentSettings, useAuthz, useStartServices } from '../../../hooks';

export function useFleetServerUnhealthy() {
  const authz = useAuthz();
  const { notifications } = useStartServices();
  const [isLoading, setIsLoading] = useState(true);
  const [isUnhealthy, setIsUnhealthy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const enrollmentSettingsResponse = await sendGetEnrollmentSettings();

      if (enrollmentSettingsResponse.error) {
        throw enrollmentSettingsResponse.error;
      }

      if (!enrollmentSettingsResponse.data?.fleet_server.has_active) {
        setIsUnhealthy(true);
      }

      setIsLoading(false);
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerUnhealthy.requestError', {
          defaultMessage: 'An error happened while fetching fleet server status',
        }),
      });
      setIsLoading(false);
    }
  }, [notifications.toasts]);

  useEffect(() => {
    if (authz.fleet.addAgents || authz.fleet.addFleetServers) {
      fetchData();
    } else {
      setIsLoading(false);
      return;
    }
  }, [fetchData, authz.fleet.addAgents, authz.fleet.addFleetServers]);

  return {
    isLoading,
    isUnhealthy,
  };
}
