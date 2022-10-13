/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElementFactory } from '../../../types';

export const bubbleChart: ElementFactory = () => ({
  name: 'bubbleChart',
  displayName: 'Bubble',
  type: 'chart',
  help: 'A customizable bubble chart',
  width: 700,
  height: 300,
  icon: 'heatmap',
  expression: `kibana
| selectFilter
| demodata
| pointseries x="project" y="sum(price)" color="state" size="size(username)"
| plot defaultStyle={seriesStyle points=5 fill=1}
| render`,
});
