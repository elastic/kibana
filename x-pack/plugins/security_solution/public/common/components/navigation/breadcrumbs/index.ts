/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr, omit } from 'lodash/fp';

import { ChromeBreadcrumb } from '../../../../../../../../src/core/public';
import { APP_NAME, APP_ID } from '../../../../../common/constants';
import { StartServices } from '../../../../types';
import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../../hosts/pages/details/utils';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../../network/pages/details';
import { getBreadcrumbs as getCaseDetailsBreadcrumbs } from '../../../../cases/pages/utils';
import { getBreadcrumbs as getDetectionRulesBreadcrumbs } from '../../../../detections/pages/detection_engine/rules/utils';
import { getBreadcrumbs as getTimelinesBreadcrumbs } from '../../../../timelines/pages';
import { getBreadcrumbs as getAdminBreadcrumbs } from '../../../../management/common/breadcrumbs';
import { SecurityPageName } from '../../../../app/types';
import {
  RouteSpyState,
  HostRouteSpyState,
  NetworkRouteSpyState,
  TimelineRouteSpyState,
  AdministrationRouteSpyState,
} from '../../../utils/route/types';
import { getAppOverviewUrl } from '../../link_to';

import { TabNavigationProps } from '../tab_navigation/types';
import { getSearch } from '../helpers';
import { GetUrlForApp, NavigateToUrl, SearchNavTab } from '../types';

export const setBreadcrumbs = (
  spyState: RouteSpyState & TabNavigationProps,
  chrome: StartServices['chrome'],
  getUrlForApp: GetUrlForApp,
  navigateToUrl: NavigateToUrl
) => {
  const breadcrumbs = getBreadcrumbsForRoute(spyState, getUrlForApp);
  if (breadcrumbs) {
    chrome.setBreadcrumbs(
      breadcrumbs.map((breadcrumb) => ({
        ...breadcrumb,
        ...(breadcrumb.href && !breadcrumb.onClick
          ? {
              onClick: (ev) => {
                ev.preventDefault();
                navigateToUrl(breadcrumb.href!);
              },
            }
          : {}),
      }))
    );
  }
};

const isNetworkRoutes = (spyState: RouteSpyState): spyState is NetworkRouteSpyState =>
  spyState != null && spyState.pageName === SecurityPageName.network;

const isHostsRoutes = (spyState: RouteSpyState): spyState is HostRouteSpyState =>
  spyState != null && spyState.pageName === SecurityPageName.hosts;

const isTimelinesRoutes = (spyState: RouteSpyState): spyState is TimelineRouteSpyState =>
  spyState != null && spyState.pageName === SecurityPageName.timelines;

const isCaseRoutes = (spyState: RouteSpyState): spyState is RouteSpyState =>
  spyState != null && spyState.pageName === SecurityPageName.case;

const isAdminRoutes = (spyState: RouteSpyState): spyState is AdministrationRouteSpyState =>
  spyState != null && spyState.pageName === SecurityPageName.administration;

const isRulesRoutes = (spyState: RouteSpyState): spyState is AdministrationRouteSpyState =>
  spyState != null && spyState.pageName === SecurityPageName.rules;

// eslint-disable-next-line complexity
export const getBreadcrumbsForRoute = (
  objectParam: RouteSpyState & TabNavigationProps,
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] | null => {
  const spyState: RouteSpyState = omit('navTabs', objectParam);

  // Sets `timeline.isOpen` to false in the state to avoid reopening the timeline on breadcrumb click. https://github.com/elastic/kibana/issues/100322
  const object = { ...objectParam, timeline: { ...objectParam.timeline, isOpen: false } };

  const overviewPath = getUrlForApp(APP_ID, { deepLinkId: SecurityPageName.overview });
  const siemRootBreadcrumb: ChromeBreadcrumb = {
    text: APP_NAME,
    href: getAppOverviewUrl(overviewPath),
  };
  if (isHostsRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }

    return [
      siemRootBreadcrumb,
      ...getHostDetailsBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        ),
        getUrlForApp
      ),
    ];
  }
  if (isNetworkRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'network', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }
    return [
      siemRootBreadcrumb,
      ...getIPDetailsBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        ),
        getUrlForApp
      ),
    ];
  }
  if (isRulesRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: SecurityPageName.rules, isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }

    return [
      siemRootBreadcrumb,
      ...getDetectionRulesBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        ),
        getUrlForApp
      ),
    ];
  }

  if (isCaseRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'case', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }

    return [
      siemRootBreadcrumb,
      ...getCaseDetailsBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        ),
        getUrlForApp
      ),
    ];
  }
  if (isTimelinesRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'timeline', isDetailPage: false };
    const urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];

    return [
      siemRootBreadcrumb,
      ...getTimelinesBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        ),
        getUrlForApp
      ),
    ];
  }

  if (isAdminRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'administration', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }
    return [siemRootBreadcrumb, ...getAdminBreadcrumbs(spyState)];
  }

  if (
    spyState != null &&
    object.navTabs &&
    spyState.pageName &&
    object.navTabs[spyState.pageName]
  ) {
    return [
      siemRootBreadcrumb,
      {
        text: object.navTabs[spyState.pageName].name,
        href: '',
      },
    ];
  }

  return null;
};
