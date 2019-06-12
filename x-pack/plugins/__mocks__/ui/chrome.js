/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiCapabilities } from './capabilities';

function getUiSettingsClient() {
  return {
    get: key => {
      switch (key) {
        case 'timepicker:timeDefaults':
          return { from: 'now-15m', to: 'now', mode: 'quick' };
        case 'timepicker:refreshIntervalDefaults':
          return { pause: false, value: 0 };
        case 'siem:defaultIndex':
          return ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'];
        default:
          throw new Error(`Unexpected config key: ${key}`);
      }
    },
  };
}

function getBasePath() {
  return '/some/base/path';
}

function addBasePath(path) {
  return path;
}

function getInjected(key) {
  switch (key) {
    case 'apmIndexPattern':
      return 'apm*';
    case 'mlEnabled':
      return true;
    case 'uiCapabilities':
      return uiCapabilities;
    case 'isCloudEnabled':
      return false;
    case 'siem:defaultIndex':
      return ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'];
    default:
      throw new Error(`Unexpected config key: ${key}`);
  }
}

function getXsrfToken() {
  return 'kbn';
}

export default {
  getInjected,
  addBasePath,
  getBasePath,
  getUiSettingsClient,
  getXsrfToken,
};
