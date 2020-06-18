/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsType } from 'src/core/server';

export const apmIndices: SavedObjectsType = {
  name: 'apm-indices',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
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
};
