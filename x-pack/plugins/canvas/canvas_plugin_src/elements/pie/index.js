/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const pie = () => ({
  name: 'pie',
  displayName: i18n.translate('xpack.canvas.elements.pieDisplayName', {
    defaultMessage: 'Pie chart',
  }),
  width: 300,
  height: 300,
  help: i18n.translate('xpack.canvas.elements.pieHelpText', {
    defaultMessage: 'Pie chart',
  }),
  image: header,
  expression: `filters
| demodata
| pointseries color="state" size="max(price)"
| pie
| render`,
});
