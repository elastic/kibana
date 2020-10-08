/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';

export const areaChart: ElementFactory = () => ({
  name: 'areaChart',
  displayName: 'Area',
  help: 'A line chart with a filled body',
  type: 'chart',
  icon: 'visArea',
  expression: `filters
  | demodata
  | pointseries x="time" y="mean(price)"
  | plot defaultStyle={seriesStyle lines=1 fill=1}
  | render`,
});
