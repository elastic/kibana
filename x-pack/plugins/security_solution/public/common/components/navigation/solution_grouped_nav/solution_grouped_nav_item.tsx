/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiListGroupItem } from '@elastic/eui';
import { useNavigation } from '../../../lib/kibana';
import { useSecuritySolutionLink } from '../../links';
import { SecurityPageName } from '../../../../../common/constants';

export type NavItemCategories = Array<{ label: string; itemIds: string[] }>;
export interface DefaultNavItem {
  id: string;
  label: string;
  href: string;
  onClick?: React.MouseEventHandler;
  items?: PortalNavItem[];
  categories?: NavItemCategories;
}

export interface CustomNavItem {
  id: string;
  render: () => React.ReactNode;
}

export type NavItem = DefaultNavItem | CustomNavItem;

export interface PortalNavItem {
  id: string;
  label: string;
  href: string;
  onClick?: React.MouseEventHandler;
  description?: string;
}

export const isCustomNavItem = (navItem: NavItem): navItem is CustomNavItem => 'render' in navItem;
export const isDefaultNavItem = (navItem: NavItem): navItem is DefaultNavItem =>
  !isCustomNavItem(navItem);

export const useNavItems: () => NavItem[] = () => {
  return [
    {
      id: SecurityPageName.dashboardsLanding,
      label: 'Dashboards',
      ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.dashboardsLanding }),
      items: [
        {
          id: 'overview',
          label: 'Overview',
          description: 'The description goes here',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.overview }),
        },
        {
          id: 'detection_response',
          label: 'Detection & Response',
          description: 'The description goes here',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.detectionAndResponse }),
        },
        // {
        //   id: SecurityPageName.cloudPostureFindings,
        //   label: 'Cloud Posture Findings',
        //   description: 'The description goes here',
        //   ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.cloudPostureFindings }),
        // },
      ],
    },
    {
      id: SecurityPageName.alerts,
      label: 'Alerts',
      ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.alerts }),
    },
    {
      id: SecurityPageName.timelines,
      label: 'Investigations',
      ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.timelines }),
    },
    {
      id: SecurityPageName.case,
      label: 'Cases',
      ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.case }),
    },
    {
      id: SecurityPageName.threatHuntingLanding,
      label: 'Threat Hunting',
      ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.threatHuntingLanding }),
      items: [
        {
          id: SecurityPageName.hosts,
          label: 'Hosts',
          description:
            'Computer or other device that communicates with other hosts on a network. Hosts on a network include clients and servers -- that send or receive data, services or applications.',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.hosts }),
        },
        {
          id: SecurityPageName.network,
          label: 'Network',
          description:
            'The action or process of interacting with others to exchange information and develop professional or social contacts.',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.network }),
        },
        {
          id: SecurityPageName.users,
          label: 'Users',
          description: 'Sudo commands dashboard from the Logs System integration.',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.users }),
        },
      ],
    },
    // TODO: implement footer and move management
    {
      id: SecurityPageName.administration,
      label: 'Manage',
      ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.administration }),
      categories: [
        { label: 'SIEM', itemIds: [SecurityPageName.rules, SecurityPageName.exceptions] },
        {
          label: 'ENDPOINTS',
          itemIds: [
            SecurityPageName.endpoints,
            SecurityPageName.policies,
            SecurityPageName.trustedApps,
            SecurityPageName.eventFilters,
            SecurityPageName.blocklist,
            SecurityPageName.hostIsolationExceptions,
          ],
        },
      ],
      items: [
        {
          id: SecurityPageName.rules,
          label: 'Rules',
          description: 'The description here',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.rules }),
        },
        {
          id: SecurityPageName.exceptions,
          label: 'Exceptions',
          description: 'The description goes here',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.exceptions }),
        },
        {
          id: SecurityPageName.endpoints,
          label: 'Endpoints',
          description: 'The description goes here',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.endpoints }),
        },
        {
          id: SecurityPageName.policies,
          label: 'Policies',
          description: 'The description goes here',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.policies }),
        },
        {
          id: SecurityPageName.trustedApps,
          label: 'Trusted applications',
          description: 'The description goes here',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.trustedApps }),
        },
        {
          id: SecurityPageName.eventFilters,
          label: 'Event filters',
          description: 'The description goes here',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.eventFilters }),
        },
        {
          id: SecurityPageName.blocklist,
          label: 'Blocklist',
          description: 'The description goes here',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.blocklist }),
        },
        {
          id: SecurityPageName.hostIsolationExceptions,
          label: 'Host Isolation IP exceptions',
          description: 'The description goes here',
          ...useSecuritySolutionLink({ deepLinkId: SecurityPageName.hostIsolationExceptions }),
        },
      ],
    },
  ];
};

export const useFooterNavItems: () => NavItem[] = () => {
  const { getAppUrl, navigateTo } = useNavigation();

  const getOnClick =
    (deepLinkId: string): React.MouseEventHandler =>
    (ev) => {
      ev.preventDefault();
      navigateTo({ deepLinkId });
    };

  return [
    {
      id: 'get_started',
      render: () => (
        <EuiLink href="/get_started">
          <EuiListGroupItem
            label=" GET STARTED"
            size="xs"
            color="text"
            icon={
              <span role="img" aria-label="get started">
                {'🚀 '}
              </span>
            }
          />
        </EuiLink>
      ),
    },
    {
      id: 'management',
      label: 'Manage',
      href: getAppUrl({ deepLinkId: 'management' }),
      onClick: getOnClick('management'),
      categories: [
        { label: 'SIEM', itemIds: ['rules', 'exceptions'] },
        { label: 'ENDPOINTS', itemIds: ['endpoints', 'event_filters'] },
      ],
      items: [
        {
          id: 'rules',
          label: 'Rules',
          description: 'The description goes here',
          href: getAppUrl({ deepLinkId: 'rules' }),
          onClick: getOnClick('rules'),
        },
        {
          id: 'exceptions',
          label: 'Rule exceptions',
          description: 'The description goes here',
          href: getAppUrl({ deepLinkId: 'exceptions' }),
          onClick: getOnClick('exceptions'),
        },
        {
          id: 'endpoints',
          label: 'Endpoints',
          description: 'The description goes here',
          href: getAppUrl({ deepLinkId: 'endpoints' }),
          onClick: getOnClick('endpoints'),
        },
        {
          id: 'event_filters',
          label: 'Event filters',
          description: 'The description goes here',
          href: getAppUrl({ deepLinkId: 'event_filters' }),
          onClick: getOnClick('event_filters'),
        },
      ],
    },
  ];
};
