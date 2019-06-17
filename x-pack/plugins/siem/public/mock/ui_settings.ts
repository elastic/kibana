/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

chrome.getUiSettingsClient().get.mockImplementation((key: string) => {
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
});
