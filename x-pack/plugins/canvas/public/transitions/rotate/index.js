/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './rotate.css';
import { i18n } from '@kbn/i18n';

export const rotate = () => ({
  name: 'rotate',
  displayName: i18n.translate('xpack.canvas.transitions.rotateDisplayNameLabel', {
    defaultMessage: 'Rotate',
  }),
  help: i18n.translate('xpack.canvas.transitions.rotateHelpText', {
    defaultMessage: 'Rotate from one page to the next',
  }),
  enter: 'rotateIn',
  exit: 'rotateOut',
});
