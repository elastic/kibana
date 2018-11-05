/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const tiltedPie = () => ({
  name: 'tiltedPie',
  displayName: i18n.translate('xpack.canvas.elements.tiltedPieDisplayName', {
    defaultMessage: 'Tilted pie chart',
  }),
  width: 500,
  height: 250,
  help: i18n.translate('xpack.canvas.elements.tiltedPieHelpText', {
    defaultMessage: 'A customizable tilted pie chart',
  }),
  image: header,
  expression: `filters
| demodata
| pointseries color="project" size="max(price)"
| pie tilt=0.5
| render`,
});
