/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { SecurityPageName } from '../../../app/types';
import type { LinkCategories } from '../../links';

export type SearchNavTab = NavTab | { urlKey: UrlStateType; isDetailPage: boolean };

export interface NavGroupTab {
  id: string;
  name: string;
}
export enum SecurityNavGroupKey {
  dashboards = 'dashboards',
  detect = 'detect',
  findings = 'findings',
  explore = 'explore',
  intelligence = 'intelligence',
  investigate = 'investigate',
  manage = 'manage',
}

export type UrlStateType =
  | 'administration'
  | 'alerts'
  | 'cases'
  | 'detection_response'
  | 'exceptions'
  | 'get_started'
  | 'host'
  | 'users'
  | 'network'
  | 'kubernetes'
  | 'overview'
  | 'rules'
  | 'timeline'
  | 'explore'
  | 'dashboards'
  | 'indicators'
  | 'cloud_posture'
  | 'findings'
  | 'entity_analytics';

export type SecurityNavGroup = Record<SecurityNavGroupKey, NavGroupTab>;
export interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
  urlKey?: UrlStateType;
  pageId?: SecurityPageName;
  isBeta?: boolean;
  betaOptions?: {
    text: string;
  };
}
export const securityNavKeys = [
  SecurityPageName.alerts,
  SecurityPageName.blocklist,
  SecurityPageName.detectionAndResponse,
  SecurityPageName.case,
  SecurityPageName.endpoints,
  SecurityPageName.landing,
  SecurityPageName.policies,
  SecurityPageName.eventFilters,
  SecurityPageName.exceptions,
  SecurityPageName.hostIsolationExceptions,
  SecurityPageName.hosts,
  SecurityPageName.network,
  SecurityPageName.overview,
  SecurityPageName.responseActionsHistory,
  SecurityPageName.rules,
  SecurityPageName.timelines,
  SecurityPageName.trustedApps,
  SecurityPageName.users,
  SecurityPageName.kubernetes,
  SecurityPageName.threatIntelligenceIndicators,
  SecurityPageName.cloudSecurityPostureDashboard,
  SecurityPageName.cloudSecurityPostureFindings,
  SecurityPageName.cloudSecurityPostureBenchmarks,
  SecurityPageName.entityAnalytics,
] as const;
export type SecurityNavKey = typeof securityNavKeys[number];

export type SecurityNav = Record<SecurityNavKey, NavTab>;

export type GenericNavRecord = Record<string, NavTab>;

export interface SecuritySolutionTabNavigationProps {
  display?: 'default' | 'condensed';
  navTabs: GenericNavRecord;
}

export type NavigateToUrl = (url: string) => void;
export interface NavLinkItem {
  categories?: LinkCategories;
  description?: string;
  disabled?: boolean;
  icon?: IconType;
  id: SecurityPageName;
  links?: NavLinkItem[];
  image?: string;
  title: string;
  skipUrlState?: boolean;
  isBeta?: boolean;
  betaOptions?: {
    text: string;
  };
}
