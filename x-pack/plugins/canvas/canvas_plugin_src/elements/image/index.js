/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const image = () => ({
  name: 'image',
  displayName: i18n.translate('xpack.canvas.elements.imageDisplayName', {
    defaultMessage: 'Image',
  }),
  help: i18n.translate('xpack.canvas.elements.imageHelpText', {
    defaultMessage: 'A static image',
  }),
  image: header,
  expression: `image dataurl=null mode="contain"
| render`,
});
