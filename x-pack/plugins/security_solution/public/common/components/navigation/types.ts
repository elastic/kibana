/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UrlStateType } from '../url_state/constants';
import { SecurityPageName } from '../../../app/types';
import { UrlState } from '../url_state/types';
import { SiemRouteType } from '../../utils/route/types';

export interface SecuritySolutionNavigationManagerProps {
  display?: 'default' | 'condensed';
  isPrimary?: boolean;
  navTabs: Record<string, NavTab>;
}

interface CommonNavigationProps {
  pageName: string;
  tabName: SiemRouteType | undefined;
  urlState: UrlState;
}

export interface SecuritySolutionNavigationProps extends CommonNavigationProps {
  navTabs: Record<string, NavTab>;
}

export interface NavigationManagerComponentProps extends CommonNavigationProps {
  pathName: string;
}

export type SearchNavTab = NavTab | { urlKey: UrlStateType; isDetailPage: boolean };

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
  | SecurityPageName.rules
  | SecurityPageName.timelines
  | SecurityPageName.case
  | SecurityPageName.administration;

export type SiemNavTab = Record<SiemNavTabKey, NavTab>;

export type GetUrlForApp = (
  appId: string,
  options?: { path?: string; absolute?: boolean }
) => string;
