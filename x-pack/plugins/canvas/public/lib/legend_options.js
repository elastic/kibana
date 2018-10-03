/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const legendOptions = [
  {
    name: i18n.translate('xpack.canvas.lib.legendOptions.hiddenNameText', {
      defaultMessage: 'Hidden',
    }),
    value: false,
  },
  {
    name: i18n.translate('xpack.canvas.lib.legendOptions.topLeftNameText', {
      defaultMessage: 'Top Left',
    }),
    value: 'nw',
  },
  {
    name: i18n.translate('xpack.canvas.lib.legendOptions.topRightNameText', {
      defaultMessage: 'Top Right',
    }),
    value: 'ne',
  },
  {
    name: i18n.translate('xpack.canvas.lib.legendOptions.bottomLeftNameText', {
      defaultMessage: 'Bottom Left',
    }),
    value: 'sw',
  },
  {
    name: i18n.translate('xpack.canvas.lib.legendOptions.bottomRightNameText', {
      defaultMessage: 'Bottom Right',
    }),
    value: 'se',
  },
];
