/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppTestingFrameworkAdapter } from '../lib/adapters/framework/testing_framework_adapter';

export const mockFrameworks: Readonly<Record<string, Partial<AppTestingFrameworkAdapter>>> = {
  default_browser: {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'Browser',
    timezone: 'America/Denver',
  },
  default_ET: {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'America/New_York',
    timezone: 'America/New_York',
  },
  default_MT: {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'America/Denver',
    timezone: 'America/Denver',
  },
  default_UTC: {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'UTC',
    timezone: 'UTC',
  },
};
