/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useGetSecuritySolutionLinkProps } from '../../links';
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
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  return [
    {
      id: SecurityPageName.dashboardsLanding,
      label: 'Dashboards',
      ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.dashboardsLanding }),
      items: [
        {
          id: 'overview',
          label: 'Overview',
          description: 'The description goes here',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.overview }),
        },
        {
          id: 'detection_response',
          label: 'Detection & Response',
          description: 'The description goes here',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.detectionAndResponse }),
        },
        // TODO: add the cloudPostureFindings to the config here
        // {
        //   id: SecurityPageName.cloudPostureFindings,
        //   label: 'Cloud Posture Findings',
        //   description: 'The description goes here',
        //   ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.cloudPostureFindings }),
        // },
      ],
    },
    {
      id: SecurityPageName.alerts,
      label: 'Alerts',
      ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.alerts }),
    },
    {
      id: SecurityPageName.timelines,
      label: 'Timelines',
      ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.timelines }),
    },
    {
      id: SecurityPageName.case,
      label: 'Cases',
      ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.case }),
    },
    {
      id: SecurityPageName.threatHuntingLanding,
      label: 'Threat Hunting',
      ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.threatHuntingLanding }),
      items: [
        {
          id: SecurityPageName.hosts,
          label: 'Hosts',
          description:
            'Computer or other device that communicates with other hosts on a network. Hosts on a network include clients and servers -- that send or receive data, services or applications.',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.hosts }),
        },
        {
          id: SecurityPageName.network,
          label: 'Network',
          description:
            'The action or process of interacting with others to exchange information and develop professional or social contacts.',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.network }),
        },
        {
          id: SecurityPageName.users,
          label: 'Users',
          description: 'Sudo commands dashboard from the Logs System integration.',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.users }),
        },
      ],
    },
    // TODO: implement footer and move management
    {
      id: SecurityPageName.administration,
      label: 'Manage',
      ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.administration }),
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
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.rules }),
        },
        {
          id: SecurityPageName.exceptions,
          label: 'Exceptions',
          description: 'The description goes here',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.exceptions }),
        },
        {
          id: SecurityPageName.endpoints,
          label: 'Endpoints',
          description: 'The description goes here',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.endpoints }),
        },
        {
          id: SecurityPageName.policies,
          label: 'Policies',
          description: 'The description goes here',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.policies }),
        },
        {
          id: SecurityPageName.trustedApps,
          label: 'Trusted applications',
          description: 'The description goes here',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.trustedApps }),
        },
        {
          id: SecurityPageName.eventFilters,
          label: 'Event filters',
          description: 'The description goes here',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.eventFilters }),
        },
        {
          id: SecurityPageName.blocklist,
          label: 'Blocklist',
          description: 'The description goes here',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.blocklist }),
        },
        {
          id: SecurityPageName.hostIsolationExceptions,
          label: 'Host Isolation IP exceptions',
          description: 'The description goes here',
          ...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.hostIsolationExceptions }),
        },
      ],
    },
  ];
};

export const useFooterNavItems: () => NavItem[] = () => {
  // TODO: implement footer items
  return [];
};
