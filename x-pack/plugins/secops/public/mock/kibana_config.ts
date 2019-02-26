/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppFrameworkAdapter } from '../lib/lib';

export const mockFrameworks: { [name: string]: Partial<AppFrameworkAdapter> } = {
  default_ET: {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'America/New_York',
  },
  default_MT: {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'America/Denver',
  },
  default_UTC: {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    dateFormatTz: 'UTC',
  },
};
