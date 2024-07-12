/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const COMMON_SLO_GROUPING = [
  {
    id: 'slos',
    getDisplayName: () =>
      i18n.translate('xpack.slo.common.constants.grouping.legacy', {
        defaultMessage: 'Observability',
      }),
    getIconType: () => {
      return 'visGauge';
    },
  },
];
