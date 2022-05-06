/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';

import { APP_ID, FEATURE_ID } from '../common/constants';

/**
 * The order of appearance in the feature privilege page
 * under the management section. Cases should be under
 * the Actions and Connectors feature
 */

const FEATURE_ORDER = 3100;

export const getCasesKibanaFeature = (): KibanaFeatureConfig => ({
  id: FEATURE_ID,
  name: i18n.translate('xpack.cases.features.casesFeatureName', {
    defaultMessage: 'Cases',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  app: [],
  order: FEATURE_ORDER,
  management: {
    insightsAndAlerting: [APP_ID],
  },
  cases: [APP_ID],
  privileges: {
    all: {
      cases: {
        all: [APP_ID],
      },
      management: {
        insightsAndAlerting: [APP_ID],
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['crud_cases', 'read_cases'],
    },
    read: {
      cases: {
        read: [APP_ID],
      },
      management: {
        insightsAndAlerting: [APP_ID],
      },
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['read_cases'],
    },
  },
});
