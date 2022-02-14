/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { KibanaFeatureConfig } from '../../features/common';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';

import { APP_ID } from '../common/constants';

export const getCasesKibanaFeature = (): KibanaFeatureConfig => ({
  id: APP_ID,
  name: i18n.translate('xpack.cases.features.casesFeatureName', {
    defaultMessage: 'Cases',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  app: [],
  order: 3100,
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
        all: [APP_ID],
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
