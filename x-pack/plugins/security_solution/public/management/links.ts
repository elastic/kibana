/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  BLOCKLIST_PATH,
  ENDPOINTS_PATH,
  EVENT_FILTERS_PATH,
  EXCEPTIONS_PATH,
  HOST_ISOLATION_EXCEPTIONS_PATH,
  MANAGEMENT_PATH,
  POLICIES_PATH,
  RULES_PATH,
  SecurityPageName,
  TRUSTED_APPS_PATH,
} from '../../common/constants';
import {
  BLOCKLIST,
  ENDPOINTS,
  EVENT_FILTERS,
  EXCEPTIONS,
  HOST_ISOLATION_EXCEPTIONS,
  MANAGE,
  POLICIES,
  RULES,
  TRUSTED_APPLICATIONS,
} from '../app/translations';
import { NavigationCategories } from '../common/components/navigation/types';
import { FEATURE, LinkItem } from '../common/links/types';

import { IconBlocklist } from './icons/blocklist';
import { IconEndpoints } from './icons/endpoints';
import { IconEndpointPolicies } from './icons/endpoint_policies';
import { IconEventFilters } from './icons/event_filters';
import { IconExceptionLists } from './icons/exception_lists';
import { IconHostIsolation } from './icons/host_isolation';
import { IconSiemRules } from './icons/siem_rules';
import { IconTrustedApplications } from './icons/trusted_applications';

export const links: LinkItem = {
  id: SecurityPageName.administration,
  title: MANAGE,
  path: MANAGEMENT_PATH,
  skipUrlState: true,
  globalNavEnabled: false,
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.manage', {
      defaultMessage: 'Manage',
    }),
  ],
  links: [
    {
      id: SecurityPageName.rules,
      title: RULES,
      description: i18n.translate('xpack.securitySolution.appLinks.rulesDescription', {
        defaultMessage:
          "Create and manage rules to check for suspicious source events, and create alerts when a rule's conditions are met.",
      }),

      landingIcon: IconSiemRules,
      path: RULES_PATH,
      globalNavEnabled: false,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.appLinks.rules', {
          defaultMessage: 'Rules',
        }),
      ],
      globalSearchEnabled: true,
    },
    {
      id: SecurityPageName.exceptions,
      title: EXCEPTIONS,
      description: i18n.translate('xpack.securitySolution.appLinks.exceptionsDescription', {
        defaultMessage: 'Create and manage exceptions to prevent the creation of unwanted alerts.',
      }),
      landingIcon: IconExceptionLists,
      path: EXCEPTIONS_PATH,
      globalNavEnabled: false,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.appLinks.exceptions', {
          defaultMessage: 'Exception lists',
        }),
      ],
      globalSearchEnabled: true,
    },
    {
      id: SecurityPageName.endpoints,
      description: i18n.translate('xpack.securitySolution.appLinks.endpointsDescription', {
        defaultMessage: 'Hosts running endpoint security.',
      }),
      landingIcon: IconEndpoints,
      globalNavEnabled: true,
      title: ENDPOINTS,
      globalNavOrder: 9006,
      path: ENDPOINTS_PATH,
      skipUrlState: true,
    },
    {
      id: SecurityPageName.policies,
      title: POLICIES,
      description: i18n.translate('xpack.securitySolution.appLinks.policiesDescription', {
        defaultMessage:
          'Use policies to customize endpoint and cloud workload protections and other configurations.',
      }),
      landingIcon: IconEndpointPolicies,
      path: POLICIES_PATH,
      skipUrlState: true,
      experimentalKey: 'policyListEnabled',
    },
    {
      id: SecurityPageName.trustedApps,
      title: TRUSTED_APPLICATIONS,
      description: i18n.translate(
        'xpack.securitySolution.appLinks.trustedApplicationsDescription',
        {
          defaultMessage:
            'Improve performance or alleviate conflicts with other applications running on your hosts.',
        }
      ),
      landingIcon: IconTrustedApplications,
      path: TRUSTED_APPS_PATH,
      skipUrlState: true,
    },
    {
      id: SecurityPageName.eventFilters,
      title: EVENT_FILTERS,
      description: i18n.translate('xpack.securitySolution.appLinks.eventFiltersDescription', {
        defaultMessage: 'Exclude high volume or unwanted events being written into Elasticsearch.',
      }),
      landingIcon: IconEventFilters,
      path: EVENT_FILTERS_PATH,
      skipUrlState: true,
    },
    {
      id: SecurityPageName.hostIsolationExceptions,
      title: HOST_ISOLATION_EXCEPTIONS,
      description: i18n.translate('xpack.securitySolution.appLinks.hostIsolationDescription', {
        defaultMessage: 'Allow isolated hosts to communicate with specific IPs.',
      }),
      landingIcon: IconHostIsolation,
      path: HOST_ISOLATION_EXCEPTIONS_PATH,
      skipUrlState: true,
    },
    {
      id: SecurityPageName.blocklist,
      title: BLOCKLIST,
      description: i18n.translate('xpack.securitySolution.appLinks.blocklistDescription', {
        defaultMessage: 'Exclude unwanted applications from running on your hosts.',
      }),
      landingIcon: IconBlocklist,
      path: BLOCKLIST_PATH,
      skipUrlState: true,
    },
  ],
};

export const navigationCategories: NavigationCategories = [
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.siem', {
      defaultMessage: 'SIEM',
    }),
    linkIds: [SecurityPageName.rules, SecurityPageName.exceptions],
  },
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.endpoints', {
      defaultMessage: 'ENDPOINTS',
    }),
    linkIds: [
      SecurityPageName.endpoints,
      SecurityPageName.policies,
      SecurityPageName.trustedApps,
      SecurityPageName.eventFilters,
      SecurityPageName.blocklist,
      SecurityPageName.hostIsolationExceptions,
    ],
  },
] as const;
