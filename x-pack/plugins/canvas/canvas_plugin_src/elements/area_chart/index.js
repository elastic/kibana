/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const areaChart = () => {
  return {
    name: 'areaChart',
    displayName: i18n.translate('xpack.canvas.elements.areaChartDisplayName', {
      defaultMessage: 'Area chart',
    }),
    help: i18n.translate('xpack.canvas.elements.areaChartHelpText', {
      defaultMessage: 'A line chart with a filled body',
    }),
    image: require('./header.png'),
    expression: `filters
  | demodata
  | pointseries x="time" y="mean(price)"
  | plot defaultStyle={seriesStyle lines=1 fill=1}
  | render`,
  };
};
