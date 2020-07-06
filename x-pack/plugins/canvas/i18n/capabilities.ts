/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CANVAS as canvas } from './constants';

export const CapabilitiesStrings = {
  ReadOnlyBadge: {
    getText: () =>
      i18n.translate('xpack.canvas.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
    getTooltip: () =>
      i18n.translate('xpack.canvas.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save {canvas} workpads',
        values: {
          canvas,
        },
      }),
  },
};
