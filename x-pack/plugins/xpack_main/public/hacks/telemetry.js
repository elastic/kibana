/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Promise from 'bluebird';
import {
  CONFIG_TELEMETRY,
  REPORT_INTERVAL_MS,
  LOCALSTORAGE_KEY,
} from '../../common/constants';

export class Telemetry {

  /**
   * @param {Object} $injector - AngularJS injector service
   * @param {Function} fetchTelemetry Method used to fetch telemetry data (expects an array response)
   */
  constructor($injector, fetchTelemetry) {
    this._storage = $injector.get('localStorage');
    this._config = $injector.get('config');
    this._$http = $injector.get('$http');
    this._telemetryUrl = $injector.get('telemetryUrl');
    this._attributes = this._storage.get(LOCALSTORAGE_KEY) || {};
    this._fetchTelemetry = fetchTelemetry;
  }

  _set(key, value) {
    this._attributes[key] = value;
  }

  _get(key) {
    return this._attributes[key];
  }

  _saveToBrowser() {
    this._storage.set(LOCALSTORAGE_KEY, this._attributes);
  }

  /*
   * Check time interval passage
   */
  _checkReportStatus() {
    // check if opt-in for telemetry is enabled in config
    if (this._config.get(CONFIG_TELEMETRY, false)) {
      // If the last report is empty it means we've never sent telemetry and
      // now is the time to send it.
      if (!this._get('lastReport')) {
        return true;
      }
      // If it's been a day since we last sent telemetry
      if (Date.now() - parseInt(this._get('lastReport'), 10) > REPORT_INTERVAL_MS) {
        return true;
      }
    }

    return false;
  }

  /*
   * Check report permission and if passes, send the report
   */
  _sendIfDue() {
    if (!this._checkReportStatus()) { return Promise.resolve(null); }

    return this._fetchTelemetry()
      .then(response => {
        return response.data.map(cluster => {
          const req = {
            method: 'POST',
            url: this._telemetryUrl,
            data: cluster
          };
          // if passing data externally, then suppress kbnXsrfToken
          if (this._telemetryUrl.match(/^https/)) { req.kbnXsrfToken = false; }
          return this._$http(req);
        });
      })
      .then(response => {
      // we sent a report, so we need to record and store the current time stamp
        this._set('lastReport', Date.now());
        this._saveToBrowser();
        return response;
      })
      .catch(() => {
      // no ajaxErrorHandlers for telemetry
        return Promise.resolve(null);
      });
  }

  /*
   * Public method
   */
  start() {
    // delay the initial report to allow the user some time to read the opt-out message
    let hasWaited = false;

    // continuously check if it's due time for a report
    window.setInterval(() => {
      if (hasWaited) {
        // throw away the return data
        this._sendIfDue();
      }
      hasWaited = true;
    }, 60000);
  }

} // end class
