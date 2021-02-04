/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { i18n } from '@kbn/i18n';

export const apmIndices: SavedObjectsType = {
  name: 'apm-indices',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      /* eslint-disable @typescript-eslint/naming-convention */
      'apm_oss.sourcemapIndices': {
        type: 'keyword',
      },
      'apm_oss.errorIndices': {
        type: 'keyword',
      },
      'apm_oss.onboardingIndices': {
        type: 'keyword',
      },
      'apm_oss.spanIndices': {
        type: 'keyword',
      },
      'apm_oss.transactionIndices': {
        type: 'keyword',
      },
      'apm_oss.metricsIndices': {
        type: 'keyword',
      },
    },
  },
  management: {
    importableAndExportable: true,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.apm.apmSettings.index', {
        defaultMessage: 'APM Settings - Index',
      }),
  },
};
