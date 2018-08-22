/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

export function TelemetryOptInProvider($injector, chrome) {

  let currentOptInStatus = $injector.get('telemetryOptedIn');

  return {
    getOptIn: () => currentOptInStatus,
    setOptIn: async (enabled) => {
      const $http = $injector.get('$http');
      await $http.post(chrome.addBasePath('/api/telemetry/v1/optIn'), { enabled });
      currentOptInStatus = enabled;

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
