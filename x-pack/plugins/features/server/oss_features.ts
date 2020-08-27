/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { FeatureConfig } from '../common/feature';

export interface BuildOSSFeaturesParams {
  savedObjectTypes: string[];
  includeTimelion: boolean;
}

export const buildOSSFeatures = ({ savedObjectTypes, includeTimelion }: BuildOSSFeaturesParams) => {
  return [
    {
      id: 'discover',
      name: i18n.translate('xpack.features.discoverFeatureName', {
        defaultMessage: 'Discover',
      }),
      order: 100,
      icon: 'discoverApp',
      navLinkId: 'discover',
      app: ['discover', 'kibana'],
      catalogue: ['discover'],
      privileges: {
        all: {
          app: ['discover', 'kibana'],
          catalogue: ['discover'],
          savedObject: {
            all: ['search', 'query', 'index-pattern'],
            read: [],
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
      ],
    },
    {
      id: 'visualize',
      name: i18n.translate('xpack.features.visualizeFeatureName', {
        defaultMessage: 'Visualize',
      }),
      order: 200,
      icon: 'visualizeApp',
      navLinkId: 'visualize',
      app: ['visualize', 'lens', 'kibana'],
      catalogue: ['visualize'],
      privileges: {
        all: {
          app: ['visualize', 'lens', 'kibana'],
          catalogue: ['visualize'],
          savedObject: {
            all: ['visualization', 'query', 'lens'],
            read: ['index-pattern', 'search'],
          },
          ui: ['show', 'delete', 'save', 'saveQuery'],
        },
        read: {
          app: ['visualize', 'lens', 'kibana'],
          catalogue: ['visualize'],
          savedObject: {
            all: [],
            read: ['index-pattern', 'search', 'visualization', 'query', 'lens'],
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
      ],
    },
    {
      id: 'dashboard',
      name: i18n.translate('xpack.features.dashboardFeatureName', {
        defaultMessage: 'Dashboard',
      }),
      order: 300,
      icon: 'dashboardApp',
      navLinkId: 'dashboards',
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
              'timelion-sheet',
              'canvas-workpad',
              'lens',
              'map',
            ],
          },
          ui: ['createNew', 'show', 'showWriteControls', 'saveQuery'],
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
              'timelion-sheet',
              'canvas-workpad',
              'map',
              'dashboard',
              'query',
            ],
          },
          ui: ['show'],
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
      ],
    },
    {
      id: 'dev_tools',
      name: i18n.translate('xpack.features.devToolsFeatureName', {
        defaultMessage: 'Dev Tools',
      }),
      order: 1300,
      icon: 'devToolsApp',
      navLinkId: 'dev_tools',
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
      icon: 'advancedSettingsApp',
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
      name: i18n.translate('xpack.features.indexPatternFeatureName', {
        defaultMessage: 'Index Pattern Management',
      }),
      order: 1600,
      icon: 'indexPatternApp',
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
      id: 'savedObjectsManagement',
      name: i18n.translate('xpack.features.savedObjectsManagementFeatureName', {
        defaultMessage: 'Saved Objects Management',
      }),
      order: 1700,
      icon: 'savedObjectsApp',
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
    ...(includeTimelion ? [timelionFeature] : []),
  ] as FeatureConfig[];
};

const timelionFeature: FeatureConfig = {
  id: 'timelion',
  name: 'Timelion',
  order: 350,
  icon: 'timelionApp',
  navLinkId: 'timelion',
  app: ['timelion', 'kibana'],
  catalogue: ['timelion'],
  privileges: {
    all: {
      app: ['timelion', 'kibana'],
      catalogue: ['timelion'],
      savedObject: {
        all: ['timelion-sheet'],
        read: ['index-pattern'],
      },
      ui: ['save'],
    },
    read: {
      app: ['timelion', 'kibana'],
      catalogue: ['timelion'],
      savedObject: {
        all: [],
        read: ['index-pattern', 'timelion-sheet'],
      },
      ui: [],
    },
  },
};
