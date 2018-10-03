/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './slide.css';
import { i18n } from '@kbn/i18n';

export const slide = () => ({
  name: 'slide',
  displayName: i18n.translate('xpack.canvas.transitions.slideDisplayName', {
    defaultMessage: 'Slide',
  }),
  help: i18n.translate('xpack.canvas.transitions.slideHelpText', {
    defaultMessage: 'Slide from one page to the next',
  }),
  enter: 'slideIn',
  exit: 'slideOut',
});
