/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../types';
import header from './header.png';

export const table: ElementFactory = () => ({
  name: 'table',
  displayName: 'Data table',
  tags: ['text'],
  help: 'A scrollable grid for displaying data in a tabular format',
  image: header,
  expression: `filters
| demodata
| table
| render`,
});
