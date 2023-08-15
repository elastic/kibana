/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { EXCEPTION_LIST_NAMESPACE_AGNOSTIC } from '@kbn/securitysolution-list-constants';
import { APP_ID } from '../../../common';

const endpointListSubFeature: SubFeatureConfig = {
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
};
const trustedApplicationsSubFeature: SubFeatureConfig = {
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
};
const hostIsolationExceptionsSubFeature: SubFeatureConfig = {
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
            `${APP_ID}-deleteHostIsolationExceptions`,
            `${APP_ID}-readHostIsolationExceptions`,
          ],
          id: 'host_isolation_exceptions_all',
          includeIn: 'none',
          name: 'All',
          savedObject: {
            all: [EXCEPTION_LIST_NAMESPACE_AGNOSTIC],
            read: [],
          },
          ui: ['readHostIsolationExceptions', 'deleteHostIsolationExceptions'],
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
};
const blocklistSubFeature: SubFeatureConfig = {
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
};
const eventFiltersSubFeature: SubFeatureConfig = {
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
};
const policyManagementSubFeature: SubFeatureConfig = {
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
};

const responseActionsHistorySubFeature: SubFeatureConfig = {
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
};
const hostIsolationSubFeature: SubFeatureConfig = {
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
          id: 'host_isolation_all',
          includeIn: 'none',
          name: 'All',
          savedObject: {
            all: [],
            read: [],
          },
          // FYI: The current set of values below (`api`, `ui`) cover only `release` response action.
          // There is a second set of values for API and UI that are added later if `endpointResponseActions`
          // appFeature is enabled. Needed to ensure that in a downgrade of license condition,
          // users are still able to un-isolate a host machine.
          api: [`${APP_ID}-writeHostIsolationRelease`],
          ui: ['writeHostIsolationRelease'],
        },
      ],
    },
  ],
};

const processOperationsSubFeature: SubFeatureConfig = {
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
};
const fileOperationsSubFeature: SubFeatureConfig = {
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'xpack.securitySolution.featureRegistry.subFeatures.fileOperations.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for File Operations access.',
    }
  ),
  name: i18n.translate('xpack.securitySolution.featureRegistry.subFeatures.fileOperations', {
    defaultMessage: 'File Operations',
  }),
  description: i18n.translate(
    'xpack.securitySolution.featureRegistry.subFeatures.fileOperations.description',
    {
      defaultMessage: 'Perform file-related response actions in the response console.',
    }
  ),
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
};

// execute operations are not available in 8.7,
// but will be available in 8.8
const executeActionSubFeature: SubFeatureConfig = {
  requireAllSpaces: true,
  privilegesTooltip: i18n.translate(
    'xpack.securitySolution.featureRegistry.subFeatures.executeOperations.privilegesTooltip',
    {
      defaultMessage: 'All Spaces is required for Execute Operations access.',
    }
  ),
  name: i18n.translate('xpack.securitySolution.featureRegistry.subFeatures.executeOperations', {
    defaultMessage: 'Execute Operations',
  }),
  description: i18n.translate(
    'xpack.securitySolution.featureRegistry.subFeatures.executeOperations.description',
    {
      // TODO: Update this description before 8.8 FF
      defaultMessage: 'Perform script execution on the endpoint.',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: [`${APP_ID}-writeExecuteOperations`],
          id: 'execute_operations_all',
          includeIn: 'none',
          name: 'All',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['writeExecuteOperations'],
        },
      ],
    },
  ],
};

export enum SecuritySubFeatureId {
  endpointList = 'endpointListSubFeature',
  trustedApplications = 'trustedApplicationsSubFeature',
  hostIsolationExceptions = 'hostIsolationExceptionsSubFeature',
  blocklist = 'blocklistSubFeature',
  eventFilters = 'eventFiltersSubFeature',
  policyManagement = 'policyManagementSubFeature',
  responseActionsHistory = 'responseActionsHistorySubFeature',
  hostIsolation = 'hostIsolationSubFeature',
  processOperations = 'processOperationsSubFeature',
  fileOperations = 'fileOperationsSubFeature',
  executeAction = 'executeActionSubFeature',
}

// Defines all the ordered Security subFeatures available
export const securitySubFeaturesMap = Object.freeze(
  new Map<SecuritySubFeatureId, SubFeatureConfig>([
    [SecuritySubFeatureId.endpointList, endpointListSubFeature],
    [SecuritySubFeatureId.trustedApplications, trustedApplicationsSubFeature],
    [SecuritySubFeatureId.hostIsolationExceptions, hostIsolationExceptionsSubFeature],
    [SecuritySubFeatureId.blocklist, blocklistSubFeature],
    [SecuritySubFeatureId.eventFilters, eventFiltersSubFeature],
    [SecuritySubFeatureId.policyManagement, policyManagementSubFeature],
    [SecuritySubFeatureId.responseActionsHistory, responseActionsHistorySubFeature],
    [SecuritySubFeatureId.hostIsolation, hostIsolationSubFeature],
    [SecuritySubFeatureId.processOperations, processOperationsSubFeature],
    [SecuritySubFeatureId.fileOperations, fileOperationsSubFeature],
    [SecuritySubFeatureId.executeAction, executeActionSubFeature],
  ])
);
