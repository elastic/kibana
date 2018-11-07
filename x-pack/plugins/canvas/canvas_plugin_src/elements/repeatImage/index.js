/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const repeatImage = () => ({
  name: 'repeatImage',
  displayName: i18n.translate('xpack.canvas.elements.repeatImageDisplayName', {
    defaultMessage: 'Image repeat',
  }),
  help: i18n.translate('xpack.canvas.elements.repeatImageHelpText', {
    defaultMessage: 'Repeats an image N times',
  }),
  image: header,
  expression: `filters
| demodata
| math "mean(cost)"
| repeatImage image=null
| render`,
});
