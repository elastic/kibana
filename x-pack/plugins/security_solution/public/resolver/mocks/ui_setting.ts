/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * A mock for Kibana UI settings.
 */
export function uiSetting(key: string): string | undefined {
  if (key === 'dateFormat') {
    return 'MMM D, YYYY @ HH:mm:ss.SSS';
  }
  if (key === 'dateFormat:tz') {
    return 'America/New_York';
  }
}
