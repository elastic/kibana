/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const verticalBarChart = () => ({
  name: 'verticalBarChart',
  displayName: i18n.translate('xpack.canvas.elements.verticalBarChartDisplayName', {
    defaultMessage: 'Vertical bar chart',
  }),
  help: i18n.translate('xpack.canvas.elements.verticalBarChartHelpText', {
    defaultMessage: 'A customizable vertical bar chart',
  }),
  image: header,
  expression: `filters
| demodata
| pointseries x="project" y="size(cost)" color="project"
| plot defaultStyle={seriesStyle bars=0.75} legend=false
| render`,
});
