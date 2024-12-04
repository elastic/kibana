/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureScope } from '../common';
import type { KibanaFeatureConfig, SubFeatureConfig } from '../common';

export interface BuildOSSFeaturesParams {
  savedObjectTypes: string[];
  includeReporting: boolean;
}

export const buildOSSFeatures = ({
  savedObjectTypes,
  includeReporting,
}: BuildOSSFeaturesParams): KibanaFeatureConfig[] => {
  const baseDiscoverFeature = getBaseDiscoverFeature(includeReporting);
  const baseVisualizeFeature = getBaseVisualizeFeature(includeReporting);
  const baseDashboardFeature = getBaseDashboardFeature(includeReporting);

  return [
    {
      deprecated: {
        notice: i18n.translate('xpack.features.discoverFeatureDeprecationNotice', {
          defaultMessage:
            'The Discover V1 privilege has been deprecated and replaced with a Discover V2 privilege in order to improve saved query management. See {link} for more details.',
          values: { link: 'https://github.com/elastic/kibana/pull/202863' },
        }),
      },
      id: 'discover',
      name: i18n.translate('xpack.features.discoverFeatureName', {
        defaultMessage: 'Discover (DEPRECATED)',
      }),
      order: 100,
      ...baseDiscoverFeature,
    },
    {
      id: 'discover_v2',
      name: i18n.translate('xpack.features.discoverFeatureNameV2', {
        defaultMessage: 'Discover',
      }),
      order: 101,
      ...baseDiscoverFeature,
    },
    {
      deprecated: {
        notice: i18n.translate('xpack.features.visualizeFeatureDeprecationNotice', {
          defaultMessage:
            'The Visualize Library V1 privilege has been deprecated and replaced with a Visualize Library V2 privilege in order to improve saved query management. See {link} for more details.',
          values: { link: 'https://github.com/elastic/kibana/pull/202863' },
        }),
      },
      id: 'visualize',
      name: i18n.translate('xpack.features.visualizeFeatureName', {
        defaultMessage: 'Visualize Library (DEPRECATED)',
      }),
      order: 700,
      ...baseVisualizeFeature,
    },
    {
      id: 'visualize_v2',
      name: i18n.translate('xpack.features.visualizeFeatureNameV2', {
        defaultMessage: 'Visualize Library',
      }),
      order: 701,
      ...baseVisualizeFeature,
    },
    {
      deprecated: {
        notice: i18n.translate('xpack.features.dashboardFeatureDeprecationNotice', {
          defaultMessage:
            'The Dashboard V1 privilege has been deprecated and replaced with a Dashboard V2 privilege in order to improve saved query management. See {link} for more details.',
          values: { link: 'https://github.com/elastic/kibana/pull/202863' },
        }),
      },
      id: 'dashboard',
      name: i18n.translate('xpack.features.dashboardFeatureName', {
        defaultMessage: 'Dashboard (DEPRECATED)',
      }),
      order: 200,
      ...baseDashboardFeature,
    },
    {
      id: 'dashboard_v2',
      name: i18n.translate('xpack.features.dashboardFeatureNameV2', {
        defaultMessage: 'Dashboard',
      }),
      order: 201,
      ...baseDashboardFeature,
    },
    {
      id: 'dev_tools',
      name: i18n.translate('xpack.features.devToolsFeatureName', {
        defaultMessage: 'Dev Tools',
      }),
      order: 1300,
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['dev_tools', 'kibana'],
      catalogue: ['console', 'searchprofiler', 'grokdebugger'],
      privileges: {
        all: {
          app: ['dev_tools', 'kibana'],
          catalogue: ['console', 'searchprofiler', 'grokdebugger'],
          api: ['console'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show', 'save'],
        },
        read: {
          app: ['dev_tools', 'kibana'],
          catalogue: ['console', 'searchprofiler', 'grokdebugger'],
          api: ['console'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show'],
        },
      },
      privilegesTooltip: i18n.translate('xpack.features.devToolsPrivilegesTooltip', {
        defaultMessage:
          'User should also be granted the appropriate Elasticsearch cluster and index privileges',
      }),
    },
    {
      id: 'advancedSettings',
      name: i18n.translate('xpack.features.advancedSettingsFeatureName', {
        defaultMessage: 'Advanced Settings',
      }),
      order: 1500,
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana'],
      catalogue: ['advanced_settings'],
      management: {
        kibana: ['settings'],
      },
      privileges: {
        all: {
          app: ['kibana'],
          catalogue: ['advanced_settings'],
          management: {
            kibana: ['settings'],
          },
          savedObject: {
            all: ['config'],
            read: [],
          },
          ui: ['save'],
        },
        read: {
          app: ['kibana'],
          catalogue: ['advanced_settings'],
          management: {
            kibana: ['settings'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    },
    {
      id: 'indexPatterns',
      name: i18n.translate('xpack.features.dataViewFeatureName', {
        defaultMessage: 'Data View Management',
      }),
      order: 1600,
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana'],
      catalogue: ['indexPatterns'],
      management: {
        kibana: ['indexPatterns'],
      },
      privileges: {
        all: {
          app: ['kibana'],
          catalogue: ['indexPatterns'],
          management: {
            kibana: ['indexPatterns'],
          },
          savedObject: {
            all: ['index-pattern'],
            read: [],
          },
          ui: ['save'],
          api: ['indexPatterns:manage'],
        },
        read: {
          app: ['kibana'],
          catalogue: ['indexPatterns'],
          management: {
            kibana: ['indexPatterns'],
          },
          savedObject: {
            all: [],
            read: ['index-pattern'],
          },
          ui: [],
        },
      },
    },
    {
      id: 'filesManagement',
      name: i18n.translate('xpack.features.filesManagementFeatureName', {
        defaultMessage: 'Files Management',
      }),
      order: 1600,
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana'],
      catalogue: [],
      management: {
        kibana: ['filesManagement'],
      },
      privileges: {
        all: {
          app: ['kibana'],
          management: {
            kibana: ['filesManagement'],
          },
          savedObject: {
            all: ['file', 'fileShare'],
            read: [],
          },
          ui: [],
          api: ['files:manageFiles', 'files:defaultImage'],
        },
        read: {
          app: ['kibana'],
          management: {
            kibana: ['filesManagement'],
          },
          savedObject: {
            all: [],
            read: ['file', 'fileShare'],
          },
          ui: [],
          api: ['files:manageFiles', 'files:defaultImage'],
        },
      },
    },
    {
      id: 'filesSharedImage',
      name: i18n.translate('xpack.features.filesSharedImagesFeatureName', {
        defaultMessage: 'Shared images',
      }),
      order: 1600,
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana'],
      catalogue: [],
      privilegesTooltip: i18n.translate('xpack.features.filesSharedImagesPrivilegesTooltip', {
        defaultMessage: 'Required to access images stored in Kibana.',
      }),
      privileges: {
        all: {
          app: ['kibana'],
          savedObject: {
            all: ['file'],
            read: [],
          },
          ui: [],
          api: ['files:defaultImage'],
        },
        read: {
          app: ['kibana'],
          savedObject: {
            all: [],
            read: ['file'],
          },
          ui: [],
          api: ['files:defaultImage'],
        },
      },
    },
    {
      id: 'savedObjectsManagement',
      name: i18n.translate('xpack.features.savedObjectsManagementFeatureName', {
        defaultMessage: 'Saved Objects Management',
      }),
      order: 1700,
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana'],
      catalogue: ['saved_objects'],
      management: {
        kibana: ['objects'],
      },
      privileges: {
        all: {
          app: ['kibana'],
          catalogue: ['saved_objects'],
          management: {
            kibana: ['objects'],
          },
          api: ['copySavedObjectsToSpaces'],
          savedObject: {
            all: [...savedObjectTypes],
            read: [],
          },
          ui: ['read', 'edit', 'delete', 'copyIntoSpace', 'shareIntoSpace'],
        },
        read: {
          app: ['kibana'],
          catalogue: ['saved_objects'],
          management: {
            kibana: ['objects'],
          },
          api: ['copySavedObjectsToSpaces'],
          savedObject: {
            all: [],
            read: [...savedObjectTypes],
          },
          ui: ['read'],
        },
      },
    },
    {
      id: 'savedQueryManagement',
      name: i18n.translate('xpack.features.savedQueryManagementFeatureName', {
        defaultMessage: 'Saved Query Management',
      }),
      order: 1750,
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: ['kibana'],
      catalogue: [],
      privilegesTooltip: i18n.translate('xpack.features.savedQueryManagementTooltip', {
        defaultMessage: 'Controls access to saved queries across Kibana',
      }),
      privileges: {
        all: {
          app: ['kibana'],
          catalogue: [],
          savedObject: {
            all: ['query'],
            read: [],
          },
          ui: ['saveQuery'],
        },
        // No read-only mode supported
        read: { disabled: true, savedObject: { all: [], read: [] }, ui: [] },
      },
    },
  ];
};

const getBaseDiscoverFeature = (
  includeReporting: boolean
): Omit<KibanaFeatureConfig, 'id' | 'name' | 'order'> => ({
  management: {
    kibana: ['search_sessions'],
    ...(includeReporting ? { insightsAndAlerting: ['reporting'] } : {}),
  },
  category: DEFAULT_APP_CATEGORIES.kibana,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: ['discover', 'kibana'],
  catalogue: ['discover'],
  privileges: {
    all: {
      app: ['discover', 'kibana'],
      api: ['fileUpload:analyzeFile'],
      catalogue: ['discover'],
      savedObject: {
        all: ['search', 'query'],
        read: ['index-pattern'],
      },
      ui: ['show', 'save', 'saveQuery'],
    },
    read: {
      app: ['discover', 'kibana'],
      catalogue: ['discover'],
      savedObject: {
        all: [],
        read: ['index-pattern', 'search', 'query'],
      },
      ui: ['show'],
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.features.ossFeatures.discoverShortUrlSubFeatureName', {
        defaultMessage: 'Short URLs',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'url_create',
              name: i18n.translate(
                'xpack.features.ossFeatures.discoverCreateShortUrlPrivilegeName',
                {
                  defaultMessage: 'Create Short URLs',
                }
              ),
              includeIn: 'all',
              savedObject: {
                all: ['url'],
                read: [],
              },
              ui: ['createShortUrl'],
            },
          ],
        },
      ],
    },
    {
      name: i18n.translate('xpack.features.ossFeatures.discoverSearchSessionsFeatureName', {
        defaultMessage: 'Store Search Sessions',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'store_search_session',
              name: i18n.translate(
                'xpack.features.ossFeatures.discoverStoreSearchSessionsPrivilegeName',
                {
                  defaultMessage: 'Store Search Sessions',
                }
              ),
              includeIn: 'all',
              savedObject: {
                all: ['search-session'],
                read: [],
              },
              ui: ['storeSearchSession'],
              management: {
                kibana: ['search_sessions'],
              },
              api: ['store_search_session'],
            },
          ],
        },
      ],
    },
    ...(includeReporting ? [reportingFeatures.discoverReporting] : []),
  ],
});

const getBaseVisualizeFeature = (
  includeReporting: boolean
): Omit<KibanaFeatureConfig, 'id' | 'name' | 'order'> => ({
  management: {
    ...(includeReporting ? { insightsAndAlerting: ['reporting'] } : {}),
  },
  category: DEFAULT_APP_CATEGORIES.kibana,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: ['visualize', 'lens', 'kibana'],
  catalogue: ['visualize'],
  privileges: {
    all: {
      app: ['visualize', 'lens', 'kibana'],
      catalogue: ['visualize'],
      savedObject: {
        all: ['visualization', 'query', 'lens'],
        read: ['index-pattern', 'search', 'tag'],
      },
      ui: ['show', 'delete', 'save', 'saveQuery'],
    },
    read: {
      app: ['visualize', 'lens', 'kibana'],
      catalogue: ['visualize'],
      savedObject: {
        all: [],
        read: ['index-pattern', 'search', 'visualization', 'query', 'lens', 'tag'],
      },
      ui: ['show'],
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.features.ossFeatures.visualizeShortUrlSubFeatureName', {
        defaultMessage: 'Short URLs',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'url_create',
              name: i18n.translate(
                'xpack.features.ossFeatures.visualizeCreateShortUrlPrivilegeName',
                {
                  defaultMessage: 'Create Short URLs',
                }
              ),
              includeIn: 'all',
              savedObject: {
                all: ['url'],
                read: [],
              },
              ui: ['createShortUrl'],
            },
          ],
        },
      ],
    },
    ...(includeReporting ? [reportingFeatures.visualizeReporting] : []),
  ],
});

const getBaseDashboardFeature = (
  includeReporting: boolean
): Omit<KibanaFeatureConfig, 'id' | 'name' | 'order'> => ({
  management: {
    kibana: ['search_sessions'],
    ...(includeReporting ? { insightsAndAlerting: ['reporting'] } : {}),
  },
  category: DEFAULT_APP_CATEGORIES.kibana,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: ['dashboards', 'kibana'],
  catalogue: ['dashboard'],
  privileges: {
    all: {
      app: ['dashboards', 'kibana'],
      catalogue: ['dashboard'],
      savedObject: {
        all: ['dashboard', 'query'],
        read: [
          'index-pattern',
          'search',
          'visualization',
          'canvas-workpad',
          'lens',
          'links',
          'map',
          'tag',
        ],
      },
      ui: ['createNew', 'show', 'showWriteControls', 'saveQuery'],
      api: ['bulkGetUserProfiles', 'dashboardUsageStats'],
    },
    read: {
      app: ['dashboards', 'kibana'],
      catalogue: ['dashboard'],
      savedObject: {
        all: [],
        read: [
          'index-pattern',
          'search',
          'visualization',
          'canvas-workpad',
          'lens',
          'links',
          'map',
          'dashboard',
          'query',
          'tag',
        ],
      },
      ui: ['show'],
      api: ['bulkGetUserProfiles', 'dashboardUsageStats'],
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.features.ossFeatures.dashboardShortUrlSubFeatureName', {
        defaultMessage: 'Short URLs',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'url_create',
              name: i18n.translate(
                'xpack.features.ossFeatures.dashboardCreateShortUrlPrivilegeName',
                {
                  defaultMessage: 'Create Short URLs',
                }
              ),
              includeIn: 'all',
              savedObject: {
                all: ['url'],
                read: [],
              },
              ui: ['createShortUrl'],
            },
          ],
        },
      ],
    },
    {
      name: i18n.translate('xpack.features.ossFeatures.dashboardSearchSessionsFeatureName', {
        defaultMessage: 'Store Search Sessions',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'store_search_session',
              name: i18n.translate(
                'xpack.features.ossFeatures.dashboardStoreSearchSessionsPrivilegeName',
                {
                  defaultMessage: 'Store Search Sessions',
                }
              ),
              includeIn: 'all',
              savedObject: {
                all: ['search-session'],
                read: [],
              },
              ui: ['storeSearchSession'],
              management: {
                kibana: ['search_sessions'],
              },
              api: ['store_search_session'],
            },
          ],
        },
      ],
    },
    ...(includeReporting ? [reportingFeatures.dashboardReporting] : []),
  ],
});

const reportingPrivilegeGroupName = i18n.translate(
  'xpack.features.ossFeatures.reporting.reportingTitle',
  {
    defaultMessage: 'Reporting',
  }
);

const reportingFeatures: {
  discoverReporting: SubFeatureConfig;
  dashboardReporting: SubFeatureConfig;
  visualizeReporting: SubFeatureConfig;
} = {
  discoverReporting: {
    name: reportingPrivilegeGroupName,
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            id: 'generate_report',
            name: i18n.translate('xpack.features.ossFeatures.reporting.discoverGenerateCSV', {
              defaultMessage: 'Generate CSV reports',
            }),
            includeIn: 'all',
            savedObject: { all: [], read: [] },
            management: { insightsAndAlerting: ['reporting'] },
            api: ['generateReport'],
            ui: ['generateCsv'],
          },
        ],
      },
    ],
  },
  dashboardReporting: {
    name: reportingPrivilegeGroupName,
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            id: 'generate_report',
            name: i18n.translate(
              'xpack.features.ossFeatures.reporting.dashboardGenerateScreenshot',
              {
                defaultMessage: 'Generate PDF or PNG reports',
              }
            ),
            includeIn: 'all',
            minimumLicense: 'gold',
            savedObject: { all: [], read: [] },
            management: { insightsAndAlerting: ['reporting'] },
            api: ['generateReport'],
            ui: ['generateScreenshot'],
          },
          {
            id: 'download_csv_report',
            name: i18n.translate('xpack.features.ossFeatures.reporting.dashboardDownloadCSV', {
              defaultMessage: 'Generate CSV reports from Saved Search panels',
            }),
            includeIn: 'all',
            savedObject: { all: [], read: [] },
            management: { insightsAndAlerting: ['reporting'] },
            api: ['downloadCsv'],
            ui: ['downloadCsv'],
          },
        ],
      },
    ],
  },
  visualizeReporting: {
    name: reportingPrivilegeGroupName,
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            id: 'generate_report',
            name: i18n.translate(
              'xpack.features.ossFeatures.reporting.visualizeGenerateScreenshot',
              {
                defaultMessage: 'Generate PDF or PNG reports',
              }
            ),
            includeIn: 'all',
            minimumLicense: 'gold',
            savedObject: { all: [], read: [] },
            management: { insightsAndAlerting: ['reporting'] },
            api: ['generateReport'],
            ui: ['generateScreenshot'],
          },
        ],
      },
    ],
  },
};
