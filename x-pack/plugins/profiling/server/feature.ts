/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';

export const PROFILING_SERVER_FEATURE_ID = 'profiling';

export const PROFILING_FEATURE = {
  id: PROFILING_SERVER_FEATURE_ID,
  name: i18n.translate('xpack.profiling.featureRegistry.profilingFeatureName', {
    defaultMessage: 'Universal Profiling',
  }),
  order: 1200,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: [PROFILING_SERVER_FEATURE_ID, 'ux', 'kibana'],
  // see x-pack/plugins/features/common/feature_kibana_privileges.ts
  privileges: {
    all: {
      app: [PROFILING_SERVER_FEATURE_ID, 'ux', 'kibana'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
      api: [PROFILING_SERVER_FEATURE_ID],
    },
    read: {
      app: [PROFILING_SERVER_FEATURE_ID, 'ux', 'kibana'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
      api: [PROFILING_SERVER_FEATURE_ID],
    },
  },
};
