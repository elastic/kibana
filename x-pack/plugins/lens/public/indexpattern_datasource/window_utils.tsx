/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const windowOptions = [
  {
    label: i18n.translate('xpack.lens.indexPattern.window.hour', {
      defaultMessage: '30 seconds (30s)',
    }),
    value: '30s',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.window.hour', {
      defaultMessage: '1 minute (1m)',
    }),
    value: '1m',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.window.hour', {
      defaultMessage: '5 minutes (5m)',
    }),
    value: '5m',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.window.hour', {
      defaultMessage: '15 minutes (15m)',
    }),
    value: '15m',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.window.hour', {
      defaultMessage: '1 hour (1h)',
    }),
    value: '1h',
  },
];
