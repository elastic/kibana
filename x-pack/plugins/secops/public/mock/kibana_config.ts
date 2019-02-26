/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppFrameworkAdapter } from '../lib/lib';

export const mockFramework: Partial<AppFrameworkAdapter> = {
  dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
  dateFormatTz: 'UTC',
};
