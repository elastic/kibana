/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElementFactory } from '../../../types';

export const lineChart: ElementFactory = () => ({
  name: 'lineChart',
  displayName: 'Line',
  type: 'chart',
  help: 'A customizable line chart',
  icon: 'visLine',
  expression: `kibana
| selectFilter
| demodata
| pointseries x="time" y="mean(price)"
| plot defaultStyle={seriesStyle lines=3}
| render`,
});
