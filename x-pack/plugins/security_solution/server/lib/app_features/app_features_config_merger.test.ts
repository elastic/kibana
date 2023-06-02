/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AppFeaturesConfigMerger } from './app_features_config_merger';
import type { Logger } from '@kbn/core/server';
import type { AppFeatureKibanaConfig } from './types';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('AppFeaturesConfigMerger', () => {
  // We don't need to update this test when cases config change
  // It mocks simplified versions of cases config
  it('merges a mocked version of cases config', () => {
    const merger = new AppFeaturesConfigMerger(mockLogger);

    const category = {
      id: 'security',
      label: 'Security app category',
    };

    const securityCasesBaseKibanaFeature: KibanaFeatureConfig = {
      id: 'CASES_FEATURE_ID',
      name: 'Cases',
      order: 1100,
      category,
      app: ['CASES_FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      privileges: {
        all: {
          api: [],
          app: ['CASES_FEATURE_ID', 'kibana'],
          catalogue: ['APP_ID'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          api: [],
          app: ['CASES_FEATURE_ID', 'kibana'],
          catalogue: ['APP_ID'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    };

    const enabledCasesAppFeaturesConfigs: AppFeatureKibanaConfig[] = [
      {
        cases: ['APP_ID'],
        privileges: {
          all: {
            api: ['casesApiTags.all'],
            ui: ['casesCapabilities.all'],
            cases: {
              create: ['APP_ID'],
              read: ['APP_ID'],
              update: ['APP_ID'],
              push: ['APP_ID'],
            },
            savedObject: {
              all: ['filesSavedObjectTypes'],
              read: ['filesSavedObjectTypes'],
            },
          },
          read: {
            api: ['casesApiTags.read'],
            ui: ['casesCapabilities.read'],
            cases: {
              read: ['APP_ID'],
            },
            savedObject: {
              all: [],
              read: ['filesSavedObjectTypes'],
            },
          },
        },
        subFeatures: [
          {
            name: 'Delete',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    api: ['casesApiTags.delete'],
                    id: 'cases_delete',
                    name: 'Delete cases and comments',
                    includeIn: 'all',
                    savedObject: {
                      all: ['filesSavedObjectTypes'],
                      read: ['filesSavedObjectTypes'],
                    },
                    cases: {
                      delete: ['APP_ID'],
                    },
                    ui: ['casesCapabilities.delete'],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const merged = merger.mergeAppFeatureConfigs(
      securityCasesBaseKibanaFeature,
      enabledCasesAppFeaturesConfigs
    );

    expect(merged).toEqual({
      id: 'CASES_FEATURE_ID',
      name: 'Cases',
      order: 1100,
      category,
      app: ['CASES_FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      cases: ['APP_ID'],
      privileges: {
        all: {
          api: ['casesApiTags.all'],
          app: ['CASES_FEATURE_ID', 'kibana'],
          catalogue: ['APP_ID'],
          cases: {
            create: ['APP_ID'],
            read: ['APP_ID'],
            update: ['APP_ID'],
            push: ['APP_ID'],
          },
          savedObject: {
            all: ['filesSavedObjectTypes'],
            read: ['filesSavedObjectTypes'],
          },
          ui: ['casesCapabilities.all'],
        },
        read: {
          api: ['casesApiTags.read'],
          app: ['CASES_FEATURE_ID', 'kibana'],
          catalogue: ['APP_ID'],
          cases: {
            read: ['APP_ID'],
          },
          savedObject: {
            all: [],
            read: ['filesSavedObjectTypes'],
          },
          ui: ['casesCapabilities.read'],
        },
      },
      subFeatures: [
        {
          name: 'Delete',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  api: ['casesApiTags.delete'],
                  id: 'cases_delete',
                  name: 'Delete cases and comments',
                  includeIn: 'all',
                  savedObject: {
                    all: ['filesSavedObjectTypes'],
                    read: ['filesSavedObjectTypes'],
                  },
                  cases: {
                    delete: ['APP_ID'],
                  },
                  ui: ['casesCapabilities.delete'],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('merges a mocked version of security basic config', () => {
    const merger = new AppFeaturesConfigMerger(mockLogger);

    const category = {
      id: 'security',
      label: 'Security app category',
    };

    const securityCasesBaseKibanaFeature: KibanaFeatureConfig = {
      id: 'SERVER_APP_ID',
      name: 'Security',
      order: 1100,
      category,
      app: ['APP_ID', 'CLOUD_POSTURE_APP_ID', 'kibana'],
      catalogue: ['APP_ID'],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: ['THRESHOLD_RULE_TYPE_ID', 'NEW_TERMS_RULE_TYPE_ID'],
      privileges: {
        all: {
          app: ['APP_ID', 'CLOUD_POSTURE_APP_ID', 'kibana'],
          catalogue: ['APP_ID'],
          api: ['APP_ID', 'cloud-security-posture-read'],
          savedObject: {
            all: ['alert', 'CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE'],
            read: [],
          },
          alerting: {
            rule: {
              all: ['SECURITY_RULE_TYPES'],
            },
            alert: {
              all: ['SECURITY_RULE_TYPES'],
            },
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: ['show', 'crud'],
        },
        read: {
          app: ['APP_ID', 'CLOUD_POSTURE_APP_ID', 'kibana'],
          catalogue: ['APP_ID'],
          api: ['APP_ID', 'lists-read', 'rac', 'cloud-security-posture-read'],
          savedObject: {
            all: [],
            read: ['CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE'],
          },
          alerting: {
            rule: {
              read: ['SECURITY_RULE_TYPES'],
            },
            alert: {
              all: ['SECURITY_RULE_TYPES'],
            },
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: ['show'],
        },
      },
      subFeatures: [
        {
          requireAllSpaces: true,
          privilegesTooltip: 'All Spaces is required for Host Isolation access.',
          name: 'Host Isolation',
          description: 'Perform the "isolate" and "release" response actions.',
          privilegeGroups: [
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  api: [`APP_ID-writeHostIsolation`],
                  id: 'host_isolation_all',
                  includeIn: 'none',
                  name: 'All',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  ui: ['writeHostIsolation'],
                },
              ],
            },
          ],
        },
      ],
    };

    const enabledCasesAppFeaturesConfigs: AppFeatureKibanaConfig[] = [
      {
        privileges: {
          all: {
            api: ['rules_load_prepackaged'],
            ui: ['rules_load_prepackaged'],
          },
        },
      },
    ];

    const merged = merger.mergeAppFeatureConfigs(
      securityCasesBaseKibanaFeature,
      enabledCasesAppFeaturesConfigs
    );

    expect(merged).toEqual({
      id: 'SERVER_APP_ID',
      name: 'Security',
      order: 1100,
      category,
      app: ['APP_ID', 'CLOUD_POSTURE_APP_ID', 'kibana'],
      catalogue: ['APP_ID'],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: ['THRESHOLD_RULE_TYPE_ID', 'NEW_TERMS_RULE_TYPE_ID'],
      privileges: {
        all: {
          app: ['APP_ID', 'CLOUD_POSTURE_APP_ID', 'kibana'],
          catalogue: ['APP_ID'],
          api: ['APP_ID', 'cloud-security-posture-read', 'rules_load_prepackaged'],
          savedObject: {
            all: ['alert', 'CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE'],
            read: [],
          },
          alerting: {
            rule: {
              all: ['SECURITY_RULE_TYPES'],
            },
            alert: {
              all: ['SECURITY_RULE_TYPES'],
            },
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: ['show', 'crud', 'rules_load_prepackaged'],
        },
        read: {
          app: ['APP_ID', 'CLOUD_POSTURE_APP_ID', 'kibana'],
          catalogue: ['APP_ID'],
          api: ['APP_ID', 'lists-read', 'rac', 'cloud-security-posture-read'],
          savedObject: {
            all: [],
            read: ['CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE'],
          },
          alerting: {
            rule: {
              read: ['SECURITY_RULE_TYPES'],
            },
            alert: {
              all: ['SECURITY_RULE_TYPES'],
            },
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: ['show'],
        },
      },
      subFeatures: [
        {
          requireAllSpaces: true,
          privilegesTooltip: 'All Spaces is required for Host Isolation access.',
          name: 'Host Isolation',
          description: 'Perform the "isolate" and "release" response actions.',
          privilegeGroups: [
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  api: [`APP_ID-writeHostIsolation`],
                  id: 'host_isolation_all',
                  includeIn: 'none',
                  name: 'All',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  ui: ['writeHostIsolation'],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
