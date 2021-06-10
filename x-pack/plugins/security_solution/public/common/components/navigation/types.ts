/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UrlStateType } from '../url_state/constants';
import { SecurityPageName, SecurityPageGroupName } from '../../../app/types';
import { UrlState } from '../url_state/types';
import { SiemRouteType } from '../../utils/route/types';

export interface SecuritySolutionTabNavigationProps {
  display?: 'default' | 'condensed';
  navTabs: Record<string, NavTab>;
}
export interface TabNavigationComponentProps {
  pageName: string;
  tabName: SiemRouteType | undefined;
  urlState: UrlState;
  pathName: string;
}

export type SearchNavTab = NavTab | { urlKey: UrlStateType; isDetailPage: boolean };

export interface NavGroupTab {
  id: string;
  name: string;
}

export type SecurityNavTabGroupKey =
  | SecurityPageGroupName.detect
  | SecurityPageGroupName.explore
  | SecurityPageGroupName.investigate
  | SecurityPageGroupName.manage;

export type NavTabGroups = Record<SecurityNavTabGroupKey, NavGroupTab>;

export interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
  urlKey: UrlStateType;
  isDetailPage?: boolean;
  pageId?: SecurityPageName;
}

export type SiemNavTabKey =
  | SecurityPageName.overview
  | SecurityPageName.hosts
  | SecurityPageName.network
  | SecurityPageName.detections
  | SecurityPageName.timelines
  | SecurityPageName.case
  | SecurityPageName.administration;

export type SiemNavTab = Record<SiemNavTabKey, NavTab>;

export type GetUrlForApp = (
  appId: string,
  options?: { path?: string; absolute?: boolean; deepLinkId?: string }
) => string;
