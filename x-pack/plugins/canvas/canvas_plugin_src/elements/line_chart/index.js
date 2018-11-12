/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const lineChart = () => ({
  name: 'lineChart',
  displayName: i18n.translate('xpack.canvas.elements.lineChartDisplayName', {
    defaultMessage: 'Line chart',
  }),
  help: i18n.translate('xpack.canvas.elements.lineChartHelpText', {
    defaultMessage: 'A customizable line chart',
  }),
  image: header,
  expression: `filters
| demodata
| pointseries x="time" y="mean(price)"
| plot defaultStyle={seriesStyle lines=3}
| render`,
});
