/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiChrome from 'ui/chrome';
import moment from 'moment';

/**
 * Fetch Telemetry data by calling the Kibana API.
 *
 * @param {Object} $http The HTTP handler
 * @param {String} basePath The base URI
 * @param {Function} _moment moment.js, but injectable for tests
 * @return {Promise} An array of cluster Telemetry objects.
 */
export function fetchTelemetry($http, { basePath = uiChrome.getBasePath(), _moment = moment, unencrypted = false } = { }) {
  return $http.post(`${basePath}/api/telemetry/v2/clusters/_stats`, {
    unencrypted,
    timeRange: {
      min: _moment().subtract(20, 'minutes').toISOString(),
      max: _moment().toISOString()
    }
  });
}
