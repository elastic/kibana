/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const bubbleChart = () => ({
  name: 'bubbleChart',
  displayName: i18n.translate('xpack.canvas.elements.bubbleChartDisplayName', {
    defaultMessage: 'Bubble chart',
  }),
  help: i18n.translate('xpack.canvas.elements.bubbleChartHelpText', {
    defaultMessage: 'A customizable bubble chart',
  }),
  width: 700,
  height: 300,
  image: header,
  expression: `filters
| demodata
| pointseries x="project" y="sum(price)" color="state" size="size(username)"
| plot defaultStyle={seriesStyle points=5 fill=1}
| render`,
});
