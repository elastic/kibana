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
import { createUICapabilities } from '../common';

/**
 * The order of appearance in the feature privilege page
 * under the management section. Cases should be under
 * the Actions and Connectors feature
 */

const FEATURE_ORDER = 3100;

export const getCasesKibanaFeature = (): KibanaFeatureConfig => {
  const capabilities = createUICapabilities();

  return {
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
        api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles'],
        cases: {
          create: [APP_ID],
          read: [APP_ID],
          update: [APP_ID],
          push: [APP_ID],
        },
        management: {
          insightsAndAlerting: [APP_ID],
        },
        savedObject: {
          all: [],
          read: [],
        },
        ui: capabilities.all,
      },
      read: {
        api: ['bulkGetUserProfiles'],
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
        ui: capabilities.read,
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.cases.features.deleteSubFeatureName', {
          defaultMessage: 'Delete',
        }),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                api: [],
                id: 'cases_delete',
                name: i18n.translate('xpack.cases.features.deleteSubFeatureDetails', {
                  defaultMessage: 'Delete cases and comments',
                }),
                includeIn: 'all',
                savedObject: {
                  all: [],
                  read: [],
                },
                cases: {
                  delete: [APP_ID],
                },
                ui: capabilities.delete,
              },
            ],
          },
        ],
      },
    ],
  };
};
