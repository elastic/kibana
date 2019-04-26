/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { setCanTrackUiMetrics } from 'ui/ui_metric';

export function TelemetryOptInProvider($injector, chrome) {
  const Notifier = $injector.get('Notifier');
  const notify = new Notifier();
  let currentOptInStatus = $injector.get('telemetryOptedIn');
  setCanTrackUiMetrics(currentOptInStatus);

  return {
    getOptIn: () => currentOptInStatus,
    setOptIn: async (enabled) => {
      setCanTrackUiMetrics(enabled);

      const $http = $injector.get('$http');

      try {
        await $http.post(chrome.addBasePath('/api/telemetry/v1/optIn'), { enabled });
        currentOptInStatus = enabled;
      } catch (error) {
        notify.error(error);
        return false;
      }

      return true;
    },
    fetchExample: async () => {
      const $http = $injector.get('$http');
      return $http.post(chrome.addBasePath(`/api/telemetry/v1/clusters/_stats`), {
        timeRange: {
          min: moment().subtract(20, 'minutes').toISOString(),
          max: moment().toISOString()
        }
      });
    }
  };
}
