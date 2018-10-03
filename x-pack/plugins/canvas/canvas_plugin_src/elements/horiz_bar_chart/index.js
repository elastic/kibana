/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const horizontalBarChart = () => ({
  name: 'horizontalBarChart',
  displayName: i18n.translate('xpack.canvas.elements.horizontalBarChartDisplayName', {
    defaultMessage: 'Horizontal bar chart',
  }),
  help: i18n.translate('xpack.canvas.elements.horizontalBarChartHelpText', {
    defaultMessage: 'A customizable horizontal bar chart',
  }),
  image: header,
  expression: `filters
| demodata
| pointseries x="size(cost)" y="project" color="project"
| plot defaultStyle={seriesStyle bars=0.75 horizontalBars=true} legend=false
| render`,
});
