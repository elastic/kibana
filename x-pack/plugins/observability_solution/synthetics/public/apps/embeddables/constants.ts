/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE = 'SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE';
export const SYNTHETICS_MONITORS_EMBEDDABLE = 'SYNTHETICS_MONITORS_EMBEDDABLE';

export const COMMON_SYNTHETICS_GROUPING = [
  {
    id: 'synthetics',
    getDisplayName: () =>
      i18n.translate('xpack.synthetics.common.constants.grouping.legacy', {
        defaultMessage: 'Synthetics',
      }),
    getIconType: () => {
      return 'online';
    },
  },
];

export const ALL_VALUE = '*';
