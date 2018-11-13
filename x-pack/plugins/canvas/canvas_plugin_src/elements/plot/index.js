/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const plot = () => ({
  name: 'plot',
  displayName: i18n.translate('xpack.canvas.elements.plotDisplayName', {
    defaultMessage: 'Coordinate plot',
  }),
  help: i18n.translate('xpack.canvas.elements.plotHelpText', {
    defaultMessage: 'Mixed line, bar or dot charts',
  }),
  image: header,
  expression: `filters
| demodata
| pointseries x="time" y="sum(price)" color="state"
| plot defaultStyle={seriesStyle points=5}
| render`,
});
