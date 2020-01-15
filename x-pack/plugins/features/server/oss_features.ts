/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { IFeature } from '../common/feature';

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
      icon: 'discoverApp',
      navLinkId: 'kibana:discover',
      app: ['kibana'],
      catalogue: ['discover'],
      privileges: [
        {
          id: 'all',
          name: 'All',
          savedObject: {
            all: ['search', 'query'],
            read: ['index-pattern'],
          },
          ui: ['show', 'save', 'saveQuery'],
        },
        {
          id: 'read',
          name: 'Read',
          savedObject: {
            all: [],
            read: ['index-pattern', 'search', 'query'],
          },
          ui: ['show'],
        },
      ],
      subFeatures: [
        {
          name: 'Short URLs',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'url_create',
                  name: 'Create Short URLs',
                  includeInPrimaryFeaturePrivilege: 'all',
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
          name: 'Alerting',
          privilegeGroups: [
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: 'alerting_readwrite',
                  name: 'Read/Write',
                  includeInPrimaryFeaturePrivilege: 'all',
                  savedObject: {
                    all: ['alerts'],
                    read: [],
                  },
                  ui: ['createAlerts', 'readAlerts'],
                },
                {
                  id: 'alerting_read',
                  name: 'Read',
                  includeInPrimaryFeaturePrivilege: 'read',
                  savedObject: {
                    all: [],
                    read: ['read'],
                  },
                  ui: ['readAlerts'],
                },
              ],
            },
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'alerting_mute',
                  name: 'Mute Alerts',
                  includeInPrimaryFeaturePrivilege: 'all',
                  savedObject: {
                    all: ['alerts'],
                    read: [],
                  },
                  ui: ['muteAlerts'],
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
      icon: 'visualizeApp',
      navLinkId: 'kibana:visualize',
      app: ['kibana', 'lens'],
      catalogue: ['visualize'],
      privileges: {
        all: {
          savedObject: {
            all: ['visualization', 'url', 'query', 'lens'],
            read: ['index-pattern', 'search'],
          },
          ui: ['show', 'createShortUrl', 'delete', 'save', 'saveQuery'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['index-pattern', 'search', 'visualization', 'query', 'lens'],
          },
          ui: ['show'],
        },
      },
    },
    {
      id: 'dashboard',
      name: i18n.translate('xpack.features.dashboardFeatureName', {
        defaultMessage: 'Dashboard',
      }),
      icon: 'dashboardApp',
      navLinkId: 'kibana:dashboard',
      app: ['kibana'],
      catalogue: ['dashboard'],
      privileges: {
        all: {
          savedObject: {
            all: ['dashboard', 'url', 'query'],
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
    },
    {
      id: 'dev_tools',
      name: i18n.translate('xpack.features.devToolsFeatureName', {
        defaultMessage: 'Dev Tools',
      }),
      icon: 'devToolsApp',
      navLinkId: 'kibana:dev_tools',
      app: ['kibana'],
      catalogue: ['console', 'searchprofiler', 'grokdebugger'],
      privileges: {
        all: {
          api: ['console'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show', 'save'],
        },
        read: {
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
      icon: 'advancedSettingsApp',
      app: ['kibana'],
      catalogue: ['advanced_settings'],
      management: {
        kibana: ['settings'],
      },
      privileges: {
        all: {
          savedObject: {
            all: ['config'],
            read: [],
          },
          ui: ['save'],
        },
        read: {
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
      icon: 'indexPatternApp',
      app: ['kibana'],
      catalogue: ['index_patterns'],
      management: {
        kibana: ['index_patterns'],
      },
      privileges: {
        all: {
          savedObject: {
            all: ['index-pattern'],
            read: [],
          },
          ui: ['save'],
        },
        read: {
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
      icon: 'savedObjectsApp',
      app: ['kibana'],
      catalogue: ['saved_objects'],
      management: {
        kibana: ['objects'],
      },
      privileges: {
        all: {
          api: ['copySavedObjectsToSpaces'],
          savedObject: {
            all: [...savedObjectTypes],
            read: [],
          },
          ui: ['read', 'edit', 'delete', 'copyIntoSpace'],
        },
        read: {
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
  ];
};

const timelionFeature: IFeature = {
  id: 'timelion',
  name: 'Timelion',
  icon: 'timelionApp',
  navLinkId: 'timelion',
  app: ['timelion', 'kibana'],
  catalogue: ['timelion'],
  privileges: [
    {
      id: 'all',
      name: 'All',
      savedObject: {
        all: ['timelion-sheet'],
        read: ['index-pattern'],
      },
      ui: ['save'],
    },
    {
      id: 'read',
      name: 'Read',
      savedObject: {
        all: [],
        read: ['index-pattern', 'timelion-sheet'],
      },
      ui: [],
    },
  ],
};
