/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';

export const lineChart: ElementFactory = () => ({
  name: 'lineChart',
  displayName: 'Line',
  type: 'chart',
  help: 'A customizable line chart',
  icon: 'visLine',
  expression: `filters
| demodata
| pointseries x="time" y="mean(price)"
| plot defaultStyle={seriesStyle lines=3}
| render`,
});
