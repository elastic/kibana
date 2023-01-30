/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { KibanaFeatureConfig, SubFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { createUICapabilities } from '@kbn/cases-plugin/common';

import { EXCEPTION_LIST_NAMESPACE_AGNOSTIC } from '@kbn/securitysolution-list-constants';
import { APP_ID, CASES_FEATURE_ID, SERVER_APP_ID } from '../common/constants';
import { savedObjectTypes } from './saved_objects';
import type { ConfigType } from './config';

export const getCasesKibanaFeature = (): KibanaFeatureConfig => {
  const casesCapabilities = createUICapabilities();

  return {
    id: CASES_FEATURE_ID,
    name: i18n.translate('xpack.securitySolution.featureRegistry.linkSecuritySolutionCaseTitle', {
      defaultMessage: 'Cases',
    }),
    order: 1100,
    category: DEFAULT_APP_CATEGORIES.security,
    app: [CASES_FEATURE_ID, 'kibana'],
    catalogue: [APP_ID],
    cases: [APP_ID],
    privileges: {
      all: {
        api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles'],
        app: [CASES_FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        cases: {
          create: [APP_ID],
          read: [APP_ID],
          update: [APP_ID],
          push: [APP_ID],
        },
        savedObject: {
          all: [],
          read: [],
        },
        ui: casesCapabilities.all,
      },
      read: {
        api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles'],
        app: [CASES_FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        cases: {
          read: [APP_ID],
        },
        savedObject: {
          all: [],
          read: [],
        },
        ui: casesCapabilities.read,
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.securitySolution.featureRegistry.deleteSubFeatureName', {
          defaultMessage: 'Delete',
        }),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                api: [],
                id: 'cases_delete',
                name: i18n.translate(
                  'xpack.securitySolution.featureRegistry.deleteSubFeatureDetails',
                  {
                    defaultMessage: 'Delete cases and comments',
                  }
                ),
                includeIn: 'all',
                savedObject: {
                  all: [],
                  read: [],
                },
                cases: {
                  delete: [APP_ID],
                },
                ui: casesCapabilities.delete,
              },
            ],
          },
        ],
      },
    ],
  };
};

// Same as the plugin id defined by Cloud Security Posture
const CLOUD_POSTURE_APP_ID = 'csp';
// Same as the saved-object type for rules defined by Cloud Security Posture
const CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE = 'csp_rule';

const responseActionSubFeatures: SubFeatureConfig[] = [
  {
    requireAllSpaces: true,
    privilegesTooltip: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.responseActionsHistory.privilegesTooltip',
      {
        defaultMessage: 'All Spaces is required for Response Actions History access.',
      }
    ),
    name: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.responseActionsHistory',
      {
        defaultMessage: 'Response Actions History',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.responseActionsHistory.description',
      {
        defaultMessage: 'Access the history of response actions performed on endpoints.',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            api: [`${APP_ID}-writeActionsLogManagement`, `${APP_ID}-readActionsLogManagement`],
            id: 'actions_log_management_all',
            includeIn: 'none',
            name: 'All',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['writeActionsLogManagement', 'readActionsLogManagement'],
          },
          {
            api: [`${APP_ID}-readActionsLogManagement`],
            id: 'actions_log_management_read',
            includeIn: 'none',
            name: 'Read',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['readActionsLogManagement'],
          },
        ],
      },
    ],
  },
  {
    requireAllSpaces: true,
    privilegesTooltip: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.hostIsolation.privilegesTooltip',
      {
        defaultMessage: 'All Spaces is required for Host Isolation access.',
      }
    ),
    name: i18n.translate('xpack.securitySolution.featureRegistry.subFeatures.hostIsolation', {
      defaultMessage: 'Host Isolation',
    }),
    description: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.hostIsolation.description',
      { defaultMessage: 'Perform the "isolate" and "release" response actions.' }
    ),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            api: [`${APP_ID}-writeHostIsolation`],
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
  {
    requireAllSpaces: true,
    privilegesTooltip: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.processOperations.privilegesTooltip',
      {
        defaultMessage: 'All Spaces is required for Process Operations access.',
      }
    ),
    name: i18n.translate('xpack.securitySolution.featureRegistry.subFeatures.processOperations', {
      defaultMessage: 'Process Operations',
    }),
    description: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.processOperations.description',
      {
        defaultMessage: 'Perform process-related response actions in the response console.',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            api: [`${APP_ID}-writeProcessOperations`],
            id: 'process_operations_all',
            includeIn: 'none',
            name: 'All',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['writeProcessOperations'],
          },
        ],
      },
    ],
  },
  {
    requireAllSpaces: true,
    privilegesTooltip: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.fileOperations.privilegesTooltip',
      {
        defaultMessage: 'All Spaces is required for File Operations access.',
      }
    ),
    name: i18n.translate('xpack.securitySolution.featureRegistr.subFeatures.fileOperations', {
      defaultMessage: 'File Operations',
    }),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            api: [`${APP_ID}-writeFileOperations`],
            id: 'file_operations_all',
            includeIn: 'none',
            name: 'All',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['writeFileOperations'],
          },
        ],
      },
    ],
  },
];

const subFeatures: SubFeatureConfig[] = [
  {
    requireAllSpaces: true,
    privilegesTooltip: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.endpointList.privilegesTooltip',
      {
        defaultMessage: 'All Spaces is required for Endpoint List access.',
      }
    ),
    name: i18n.translate('xpack.securitySolution.featureRegistry.subFeatures.endpointList', {
      defaultMessage: 'Endpoint List',
    }),
    description: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.endpointList.description',
      {
        defaultMessage:
          'Displays all hosts running Elastic Defend and their relevant integration details.',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            api: [`${APP_ID}-writeEndpointList`, `${APP_ID}-readEndpointList`],
            id: 'endpoint_list_all',
            includeIn: 'none',
            name: 'All',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['writeEndpointList', 'readEndpointList'],
          },
          {
            api: [`${APP_ID}-readEndpointList`],
            id: 'endpoint_list_read',
            includeIn: 'none',
            name: 'Read',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['readEndpointList'],
          },
        ],
      },
    ],
  },
  {
    requireAllSpaces: true,
    privilegesTooltip: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.trustedApplications.privilegesTooltip',
      {
        defaultMessage: 'All Spaces is required for Trusted Applications access.',
      }
    ),
    name: i18n.translate('xpack.securitySolution.featureRegistry.subFeatures.trustedApplications', {
      defaultMessage: 'Trusted Applications',
    }),
    description: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.trustedApplications.description',
      {
        defaultMessage:
          'Helps mitigate conflicts with other software, usually other antivirus or endpoint security applications.',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            api: [
              'lists-all',
              'lists-read',
              'lists-summary',
              `${APP_ID}-writeTrustedApplications`,
              `${APP_ID}-readTrustedApplications`,
            ],
            id: 'trusted_applications_all',
            includeIn: 'none',
            name: 'All',
            savedObject: {
              all: [EXCEPTION_LIST_NAMESPACE_AGNOSTIC],
              read: [],
            },
            ui: ['writeTrustedApplications', 'readTrustedApplications'],
          },
          {
            api: ['lists-read', 'lists-summary', `${APP_ID}-readTrustedApplications`],
            id: 'trusted_applications_read',
            includeIn: 'none',
            name: 'Read',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['readTrustedApplications'],
          },
        ],
      },
    ],
  },
  {
    requireAllSpaces: true,
    privilegesTooltip: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.hostIsolationExceptions.privilegesTooltip',
      {
        defaultMessage: 'All Spaces is required for Host Isolation Exceptions access.',
      }
    ),
    name: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.hostIsolationExceptions',
      {
        defaultMessage: 'Host Isolation Exceptions',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.hostIsolationExceptions.description',
      {
        defaultMessage:
          'Add specific IP addresses that isolated hosts are still allowed to communicate with, even when isolated from the rest of the network.',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            api: [
              'lists-all',
              'lists-read',
              'lists-summary',
              `${APP_ID}-writeHostIsolationExceptions`,
              `${APP_ID}-readHostIsolationExceptions`,
            ],
            id: 'host_isolation_exceptions_all',
            includeIn: 'none',
            name: 'All',
            savedObject: {
              all: [EXCEPTION_LIST_NAMESPACE_AGNOSTIC],
              read: [],
            },
            ui: ['writeHostIsolationExceptions', 'readHostIsolationExceptions'],
          },
          {
            api: ['lists-read', 'lists-summary', `${APP_ID}-readHostIsolationExceptions`],
            id: 'host_isolation_exceptions_read',
            includeIn: 'none',
            name: 'Read',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['readHostIsolationExceptions'],
          },
        ],
      },
    ],
  },
  {
    requireAllSpaces: true,
    privilegesTooltip: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.blockList.privilegesTooltip',
      {
        defaultMessage: 'All Spaces is required for Blocklist access.',
      }
    ),
    name: i18n.translate('xpack.securitySolution.featureRegistry.subFeatures.blockList', {
      defaultMessage: 'Blocklist',
    }),
    description: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.blockList.description',
      {
        defaultMessage:
          'Extend Elastic Defend’s protection against malicious processes and protect against potentially harmful applications.',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            api: [
              'lists-all',
              'lists-read',
              'lists-summary',
              `${APP_ID}-writeBlocklist`,
              `${APP_ID}-readBlocklist`,
            ],
            id: 'blocklist_all',
            includeIn: 'none',
            name: 'All',
            savedObject: {
              all: [EXCEPTION_LIST_NAMESPACE_AGNOSTIC],
              read: [],
            },
            ui: ['writeBlocklist', 'readBlocklist'],
          },
          {
            api: ['lists-read', 'lists-summary', `${APP_ID}-readBlocklist`],
            id: 'blocklist_read',
            includeIn: 'none',
            name: 'Read',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['readBlocklist'],
          },
        ],
      },
    ],
  },
  {
    requireAllSpaces: true,
    privilegesTooltip: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.eventFilters.privilegesTooltip',
      {
        defaultMessage: 'All Spaces is required for Event Filters access.',
      }
    ),
    name: i18n.translate('xpack.securitySolution.featureRegistry.subFeatures.eventFilters', {
      defaultMessage: 'Event Filters',
    }),
    description: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.eventFilters.description',
      {
        defaultMessage:
          'Filter out endpoint events that you do not need or want stored in Elasticsearch.',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            api: [
              'lists-all',
              'lists-read',
              'lists-summary',
              `${APP_ID}-writeEventFilters`,
              `${APP_ID}-readEventFilters`,
            ],
            id: 'event_filters_all',
            includeIn: 'none',
            name: 'All',
            savedObject: {
              all: [EXCEPTION_LIST_NAMESPACE_AGNOSTIC],
              read: [],
            },
            ui: ['writeEventFilters', 'readEventFilters'],
          },
          {
            api: ['lists-read', 'lists-summary', `${APP_ID}-readEventFilters`],
            id: 'event_filters_read',
            includeIn: 'none',
            name: 'Read',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['readEventFilters'],
          },
        ],
      },
    ],
  },
  {
    requireAllSpaces: true,
    privilegesTooltip: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.policyManagement.privilegesTooltip',
      {
        defaultMessage: 'All Spaces is required for Policy Management access.',
      }
    ),
    name: i18n.translate('xpack.securitySolution.featureRegistry.subFeatures.policyManagement', {
      defaultMessage: 'Elastic Defend Policy Management',
    }),
    description: i18n.translate(
      'xpack.securitySolution.featureRegistry.subFeatures.policyManagement.description',
      {
        defaultMessage:
          'Access the Elastic Defend integration policy to configure protections, event collection, and advanced policy features.',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            api: [`${APP_ID}-writePolicyManagement`, `${APP_ID}-readPolicyManagement`],
            id: 'policy_management_all',
            includeIn: 'none',
            name: 'All',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['writePolicyManagement', 'readPolicyManagement'],
          },
          {
            api: [`${APP_ID}-readPolicyManagement`],
            id: 'policy_management_read',
            includeIn: 'none',
            name: 'Read',
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['readPolicyManagement'],
          },
        ],
      },
    ],
  },
  ...responseActionSubFeatures,
];

function getSubFeatures(experimentalFeatures: ConfigType['experimentalFeatures']) {
  let filteredSubFeatures: SubFeatureConfig[] = [];

  if (experimentalFeatures.endpointRbacEnabled) {
    filteredSubFeatures = subFeatures;
  } else if (experimentalFeatures.endpointRbacV1Enabled) {
    filteredSubFeatures = responseActionSubFeatures;
  }

  if (!experimentalFeatures.responseActionGetFileEnabled) {
    filteredSubFeatures = filteredSubFeatures.filter((subFeat) => {
      return subFeat.name !== 'File Operations';
    });
  }

  return filteredSubFeatures;
}

export const getKibanaPrivilegesFeaturePrivileges = (
  ruleTypes: string[],
  experimentalFeatures: ConfigType['experimentalFeatures']
): KibanaFeatureConfig => ({
  id: SERVER_APP_ID,
  name: i18n.translate('xpack.securitySolution.featureRegistry.linkSecuritySolutionTitle', {
    defaultMessage: 'Security',
  }),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
  catalogue: [APP_ID],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: ruleTypes,
  privileges: {
    all: {
      app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [
        APP_ID,
        'lists-all',
        'lists-read',
        'lists-summary',
        'rac',
        'cloud-security-posture-all',
        'cloud-security-posture-read',
      ],
      savedObject: {
        all: [
          'alert',
          'exception-list',
          EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
          DATA_VIEW_SAVED_OBJECT_TYPE,
          ...savedObjectTypes,
          CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE,
        ],
        read: [],
      },
      alerting: {
        rule: {
          all: ruleTypes,
        },
        alert: {
          all: ruleTypes,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'crud'],
    },
    read: {
      app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [APP_ID, 'lists-read', 'rac', 'cloud-security-posture-read'],
      savedObject: {
        all: [],
        read: [
          'exception-list',
          EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
          DATA_VIEW_SAVED_OBJECT_TYPE,
          ...savedObjectTypes,
          CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE,
        ],
      },
      alerting: {
        rule: {
          read: ruleTypes,
        },
        alert: {
          all: ruleTypes,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show'],
    },
  },
  subFeatures: getSubFeatures(experimentalFeatures),
});
