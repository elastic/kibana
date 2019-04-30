/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { TELEMETRY_READ_ROLES, TELEMETRY_NO_READ_ACCESS_ERR_CODE } from '../../common/constants';
import { setCanTrackUiMetrics } from 'ui/ui_metric';

export function TelemetryOptInProvider($injector, chrome) {
  const Notifier = $injector.get('Notifier');
  const notify = new Notifier();
  let currentOptInStatus = $injector.get('telemetryOptedIn');
  setCanTrackUiMetrics(currentOptInStatus);

  const provider = {
    getReadRoles: () => TELEMETRY_READ_ROLES,
    getErrorCodes: ()  => ({ noReadAccess: TELEMETRY_NO_READ_ACCESS_ERR_CODE }),
    canUserRead: (role) => provider.getReadRoles().includes(role),
    getOptIn: () => currentOptInStatus,
    setOptIn: async (enabled) => {
      setCanTrackUiMetrics(enabled);

      const $http = $injector.get('$http');

      try {
        await $http.post(chrome.addBasePath('/api/telemetry/v2/optIn'), { enabled });
        currentOptInStatus = enabled;
      } catch (error) {
        notify.error(error);
        return false;
      }

      return true;
    },
    fetchExample: async () => {
      const $http = $injector.get('$http');
      return $http.post(chrome.addBasePath(`/api/telemetry/v2/clusters/_stats`), {
        unencrypted: true,
        timeRange: {
          min: moment().subtract(20, 'minutes').toISOString(),
          max: moment().toISOString()
        }
      });
    }
  };

  return provider;
}
