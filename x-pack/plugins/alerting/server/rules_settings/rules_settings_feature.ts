/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import {
  RULES_SETTINGS_FEATURE_ID,
  READ_FLAPPING_SETTINGS_SUB_FEATURE_ID,
  ALL_FLAPPING_SETTINGS_SUB_FEATURE_ID,
  API_PRIVILEGES,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  ALL_QUERY_DELAY_SETTINGS_SUB_FEATURE_ID,
  READ_QUERY_DELAY_SETTINGS_SUB_FEATURE_ID,
} from '../../common';

export function getRulesSettingsFeature(isServerless: boolean): KibanaFeatureConfig {
  const settings = {
    id: RULES_SETTINGS_FEATURE_ID,
    name: i18n.translate('xpack.alerting.feature.rulesSettingsFeatureName', {
      defaultMessage: 'Rules Settings',
    }),
    category: DEFAULT_APP_CATEGORIES.management,
    scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
    app: [],
    management: {
      insightsAndAlerting: ['triggersActions'],
    },
    privileges: {
      all: {
        app: [],
        api: [],
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        savedObject: {
          all: [RULES_SETTINGS_SAVED_OBJECT_TYPE],
          read: [],
        },
        ui: ['show', 'save'],
      },
      read: {
        app: [],
        api: [],
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        savedObject: {
          all: [],
          read: [RULES_SETTINGS_SAVED_OBJECT_TYPE],
        },
        ui: ['show'],
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.alerting.feature.flappingSettingsSubFeatureName', {
          defaultMessage: 'Flapping detection',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: [
                  API_PRIVILEGES.READ_FLAPPING_SETTINGS,
                  API_PRIVILEGES.WRITE_FLAPPING_SETTINGS,
                ],
                name: 'All',
                id: ALL_FLAPPING_SETTINGS_SUB_FEATURE_ID,
                includeIn: 'all',
                savedObject: {
                  all: [RULES_SETTINGS_SAVED_OBJECT_TYPE],
                  read: [],
                },
                ui: ['writeFlappingSettingsUI', 'readFlappingSettingsUI'],
              },
              {
                api: [API_PRIVILEGES.READ_FLAPPING_SETTINGS],
                name: 'Read',
                id: READ_FLAPPING_SETTINGS_SUB_FEATURE_ID,
                includeIn: 'read',
                savedObject: {
                  all: [],
                  read: [RULES_SETTINGS_SAVED_OBJECT_TYPE],
                },
                ui: ['readFlappingSettingsUI'],
              },
            ],
          },
        ],
      },
    ],
  };

  if (isServerless) {
    settings.subFeatures.push({
      name: i18n.translate('xpack.alerting.feature.queryDelaySettingsSubFeatureName', {
        defaultMessage: 'Query delay',
      }),
      privilegeGroups: [
        {
          groupType: 'mutually_exclusive',
          privileges: [
            {
              api: [
                API_PRIVILEGES.READ_QUERY_DELAY_SETTINGS,
                API_PRIVILEGES.WRITE_QUERY_DELAY_SETTINGS,
              ],
              name: 'All',
              id: ALL_QUERY_DELAY_SETTINGS_SUB_FEATURE_ID,
              includeIn: 'all',
              savedObject: {
                all: [RULES_SETTINGS_SAVED_OBJECT_TYPE],
                read: [],
              },
              ui: ['writeQueryDelaySettingsUI', 'readQueryDelaySettingsUI'],
            },
            {
              api: [API_PRIVILEGES.READ_QUERY_DELAY_SETTINGS],
              name: 'Read',
              id: READ_QUERY_DELAY_SETTINGS_SUB_FEATURE_ID,
              includeIn: 'read',
              savedObject: {
                all: [],
                read: [RULES_SETTINGS_SAVED_OBJECT_TYPE],
              },
              ui: ['readQueryDelaySettingsUI'],
            },
          ],
        },
      ],
    });
  }

  return settings as KibanaFeatureConfig;
}
