/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const debug = () => ({
  name: 'debug',
  displayName: i18n.translate('xpack.canvas.elements.debugDisplayName', {
    defaultMessage: 'Debug',
  }),
  help: i18n.translate('xpack.canvas.elements.debugHelpText', {
    defaultMessage: 'Just dumps the configuration of the element',
  }),
  image: header,
  expression: `demodata
| render as=debug`,
});
