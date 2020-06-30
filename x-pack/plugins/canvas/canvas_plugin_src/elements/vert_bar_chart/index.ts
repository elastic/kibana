/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementFactory } from '../../../types';

export const verticalBarChart: ElementFactory = () => ({
  name: 'verticalBarChart',
  displayName: 'Vertical bar chart',
  type: 'chart',
  help: 'A customizable vertical bar chart',
  icon: 'visBarVertical',
  expression: `filters
| demodata
| pointseries x="project" y="size(cost)" color="project"
| plot defaultStyle={seriesStyle bars=0.75} legend=false
| render`,
});
