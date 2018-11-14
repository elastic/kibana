/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const revealImage = () => ({
  name: 'revealImage',
  displayName: i18n.translate('xpack.canvas.elements.revealImageDisplayName', {
    defaultMessage: 'Image reveal',
  }),
  help: i18n.translate('xpack.canvas.elements.revealImageHelpText', {
    defaultMessage: 'Reveals a percentage of an image',
  }),
  image: header,
  expression: `filters
| demodata
| math "mean(percent_uptime)"
| revealImage origin=bottom image=null
| render`,
});
