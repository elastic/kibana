/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, omit } from 'lodash/fp';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ChromeBreadcrumb } from '../../../../../../../../src/core/public';
import { APP_NAME } from '../../../../../common/constants';
import { StartServices } from '../../../../plugin';
import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../../hosts/pages/details/utils';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../../network/pages/ip_details';
import { getBreadcrumbs as getCaseDetailsBreadcrumbs } from '../../../../cases/pages/utils';
import { getBreadcrumbs as getDetectionRulesBreadcrumbs } from '../../../../alerts/pages/detection_engine/rules/utils';
import { getBreadcrumbs as getTimelinesBreadcrumbs } from '../../../../timelines/pages';
import { SiemPageName } from '../../../../app/types';
import {
  RouteSpyState,
  HostRouteSpyState,
  NetworkRouteSpyState,
  TimelineRouteSpyState,
} from '../../../utils/route/types';
import { getOverviewUrl } from '../../link_to';

import { TabNavigationProps } from '../tab_navigation/types';
import { getSearch } from '../helpers';
import { SearchNavTab } from '../types';

export const setBreadcrumbs = (
  spyState: RouteSpyState & TabNavigationProps,
  chrome: StartServices['chrome']
) => {
  const breadcrumbs = getBreadcrumbsForRoute(spyState);
  if (breadcrumbs) {
    chrome.setBreadcrumbs(breadcrumbs);
  }
};

export const siemRootBreadcrumb: ChromeBreadcrumb[] = [
  {
    text: APP_NAME,
    href: getOverviewUrl(),
  },
];

const isNetworkRoutes = (spyState: RouteSpyState): spyState is NetworkRouteSpyState =>
  spyState != null && spyState.pageName === SiemPageName.network;

const isHostsRoutes = (spyState: RouteSpyState): spyState is HostRouteSpyState =>
  spyState != null && spyState.pageName === SiemPageName.hosts;

const isTimelinesRoutes = (spyState: RouteSpyState): spyState is TimelineRouteSpyState =>
  spyState != null && spyState.pageName === SiemPageName.timelines;

const isCaseRoutes = (spyState: RouteSpyState): spyState is RouteSpyState =>
  spyState != null && spyState.pageName === SiemPageName.case;

const isDetectionsRoutes = (spyState: RouteSpyState) =>
  spyState != null && spyState.pageName === SiemPageName.detections;

export const getBreadcrumbsForRoute = (
  object: RouteSpyState & TabNavigationProps
): ChromeBreadcrumb[] | null => {
  const spyState: RouteSpyState = omit('navTabs', object);
  if (isHostsRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }
    return [
      ...siemRootBreadcrumb,
      ...getHostDetailsBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        )
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
      ...siemRootBreadcrumb,
      ...getIPDetailsBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        )
      ),
    ];
  }
  if (isDetectionsRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'detections', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }

    return [
      ...siemRootBreadcrumb,
      ...getDetectionRulesBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        )
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
      ...siemRootBreadcrumb,
      ...getCaseDetailsBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        )
      ),
    ];
  }
  if (isTimelinesRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'timeline', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }

    return [
      ...siemRootBreadcrumb,
      ...getTimelinesBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        )
      ),
    ];
  }
  if (
    spyState != null &&
    object.navTabs &&
    spyState.pageName &&
    object.navTabs[spyState.pageName]
  ) {
    return [
      ...siemRootBreadcrumb,
      {
        text: object.navTabs[spyState.pageName].name,
        href: '',
      },
    ];
  }

  return null;
};
