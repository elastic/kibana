/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TableRenderer } from './table';
// import { JsonRenderer } from './json';
import { ChartRenderer } from './chart';

export const renderersRegistry = {
  table: TableRenderer,
  // json: JsonRenderer,
  chart: ChartRenderer,
};
