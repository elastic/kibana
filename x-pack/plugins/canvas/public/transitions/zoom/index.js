/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './zoom.css';
import { i18n } from '@kbn/i18n';

export const zoom = () => ({
  name: 'zoom',
  displayName: i18n.translate('xpack.canvas.transitions.zoomDisplayNameLabel', {
    defaultMessage: 'Zoom',
  }),
  help: i18n.translate('xpack.canvas.transitions.zoomHelpText', {
    defaultMessage: 'Zoom from one page to the next',
  }),
  enter: 'zoomIn',
  exit: 'zoomOut',
});
