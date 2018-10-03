/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './fade.css';
import { i18n } from '@kbn/i18n';

export const fade = () => ({
  name: 'fade',
  displayName: i18n.translate('xpack.canvas.transitions.fadeDisplayName', {
    defaultMessage: 'Fade',
  }),
  help: i18n.translate('xpack.canvas.transitions.fadeHelpText', {
    defaultMessage: 'Fade from one page to the next',
  }),
  enter: 'fadeIn',
  exit: 'fadeOut',
});
