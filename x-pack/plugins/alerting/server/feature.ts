/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';

export const alertingFeatures: KibanaFeatureConfig = {
  id: 'rules_configuration',
  name: i18n.translate('xpack.alerting.feature.rulesConfigurationFeatureName', {
    defaultMessage: 'Rules Configuration',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  app: [],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  privileges: {
    all: {
      app: [],
      api: ['get-rules-configuration', 'update-rules-configuration'],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      savedObject: {
        all: ['rules_configuration'],
        read: [],
      },
      ui: ['show', 'save'],
    },
    read: {
      app: [],
      api: ['get-rules-configuration'],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      savedObject: {
        all: [],
        read: ['rules_configuration'],
      },
      ui: ['show'],
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.alerting.feature.flappingDetectionSubFeatureName', {
        defaultMessage: 'Flapping Detection',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'flapping_detection',
              name: i18n.translate('xpack.alerting.feature.flappingDetectionSubFeature', {
                defaultMessage: 'Alert Flapping Detection',
              }),
              includeIn: 'all',
              api: [],
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['flappingDetection'],
            },
          ],
        },
      ],
    },
  ],
};
