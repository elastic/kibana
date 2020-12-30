/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';

export const table: ElementFactory = () => ({
  name: 'table',
  displayName: 'Data table',
  type: 'chart',
  help: 'A scrollable grid for displaying data in a tabular format',
  icon: 'visTable',
  expression: `filters
| demodata
| table
| render`,
});
