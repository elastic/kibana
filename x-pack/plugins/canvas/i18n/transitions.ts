/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TransitionStrings = {
  fade: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.transitions.fade.displayName', {
        defaultMessage: 'Fade',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.transitions.fade.help', {
        defaultMessage: 'Fade from one page to the next',
      }),
  },
  rotate: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.transitions.rotate.displayName', {
        defaultMessage: 'Rotate',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.transitions.rotate.help', {
        defaultMessage: 'Rotate from one page to the next',
      }),
  },
  slide: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.transitions.slide.displayName', {
        defaultMessage: 'Slide',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.transitions.slide.help', {
        defaultMessage: 'Slide from one page to the next',
      }),
  },
  zoom: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.transitions.zoom.displayName', {
        defaultMessage: 'Zoom',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.transitions.zoom.help', {
        defaultMessage: 'Zoom from one page to the next',
      }),
  },
};
