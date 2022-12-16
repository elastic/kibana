/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last, omit } from 'lodash/fp';

import { useDispatch } from 'react-redux';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { StartServices } from '../../../../types';
import { getTrailingBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../../explore/hosts/pages/details/utils';
import { getTrailingBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../../explore/network/pages/details';
import { getTrailingBreadcrumbs as getDetectionRulesBreadcrumbs } from '../../../../detections/pages/detection_engine/rules/utils';
import { getTrailingBreadcrumbs as geExceptionsBreadcrumbs } from '../../../../exceptions/utils/pages.utils';
import { getTrailingBreadcrumbs as getCSPBreadcrumbs } from '../../../../cloud_security_posture/breadcrumbs';
import { getTrailingBreadcrumbs as getUsersBreadcrumbs } from '../../../../explore/users/pages/details/utils';
import { getTrailingBreadcrumbs as getKubernetesBreadcrumbs } from '../../../../kubernetes/pages/utils/breadcrumbs';
import { getTrailingBreadcrumbs as getAlertDetailBreadcrumbs } from '../../../../detections/pages/alert_details/utils/breadcrumbs';
import { SecurityPageName } from '../../../../app/types';
import type {
  RouteSpyState,
  HostRouteSpyState,
  NetworkRouteSpyState,
  AdministrationRouteSpyState,
  UsersRouteSpyState,
  AlertDetailRouteSpyState,
} from '../../../utils/route/types';
import { timelineActions } from '../../../../timelines/store/timeline';
import { TimelineId } from '../../../../../common/types/timeline';
import type { GenericNavRecord, NavigateToUrl } from '../types';
import { getLeadingBreadcrumbsForSecurityPage } from './get_breadcrumbs_for_page';
import type { GetSecuritySolutionUrl } from '../../link_to';
import { useGetSecuritySolutionUrl } from '../../link_to';
import { useIsGroupedNavigationEnabled } from '../helpers';

export interface ObjectWithNavTabs {
  navTabs: GenericNavRecord;
}

export const useSetBreadcrumbs = () => {
  const dispatch = useDispatch();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const isGroupedNavigationEnabled = useIsGroupedNavigationEnabled();

  return (
    spyState: RouteSpyState & ObjectWithNavTabs,
    chrome: StartServices['chrome'],
    navigateToUrl: NavigateToUrl
  ) => {
    const breadcrumbs = getBreadcrumbsForRoute(
      spyState,
      getSecuritySolutionUrl,
      isGroupedNavigationEnabled
    );
    if (breadcrumbs) {
      chrome.setBreadcrumbs(
        breadcrumbs.map((breadcrumb) => ({
          ...breadcrumb,
          ...(breadcrumb.href && !breadcrumb.onClick
            ? {
                onClick: (ev) => {
                  ev.preventDefault();

                  dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: false }));

                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  navigateToUrl(breadcrumb.href!);
                },
              }
            : {}),
        }))
      );
    }
  };
};

export const getBreadcrumbsForRoute = (
  object: RouteSpyState & ObjectWithNavTabs,
  getSecuritySolutionUrl: GetSecuritySolutionUrl,
  isGroupedNavigationEnabled: boolean
): ChromeBreadcrumb[] | null => {
  const spyState: RouteSpyState = omit('navTabs', object);

  if (!spyState || !object.navTabs || !spyState.pageName || isCaseRoutes(spyState)) {
    return null;
  }

  const newMenuLeadingBreadcrumbs = getLeadingBreadcrumbsForSecurityPage(
    spyState.pageName,
    getSecuritySolutionUrl,
    object.navTabs,
    isGroupedNavigationEnabled
  );

  // last newMenuLeadingBreadcrumbs is the current page
  const pageBreadcrumb = newMenuLeadingBreadcrumbs[newMenuLeadingBreadcrumbs.length - 1];
  const siemRootBreadcrumb = newMenuLeadingBreadcrumbs[0];

  const leadingBreadcrumbs = isGroupedNavigationEnabled
    ? newMenuLeadingBreadcrumbs
    : [siemRootBreadcrumb, pageBreadcrumb];

  return emptyLastBreadcrumbUrl([
    ...leadingBreadcrumbs,
    ...getTrailingBreadcrumbsForRoutes(spyState, getSecuritySolutionUrl),
  ]);
};

const getTrailingBreadcrumbsForRoutes = (
  spyState: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
  if (isHostsRoutes(spyState)) {
    return getHostDetailsBreadcrumbs(spyState, getSecuritySolutionUrl);
  }
  if (isNetworkRoutes(spyState)) {
    return getIPDetailsBreadcrumbs(spyState, getSecuritySolutionUrl);
  }

  if (isUsersRoutes(spyState)) {
    return getUsersBreadcrumbs(spyState, getSecuritySolutionUrl);
  }

  if (isRulesRoutes(spyState)) {
    return getDetectionRulesBreadcrumbs(spyState, getSecuritySolutionUrl);
  }

  if (isExceptionRoutes(spyState)) return geExceptionsBreadcrumbs(spyState, getSecuritySolutionUrl);

  if (isKubernetesRoutes(spyState)) {
    return getKubernetesBreadcrumbs(spyState, getSecuritySolutionUrl);
  }
  if (isAlertRoutes(spyState)) {
    return getAlertDetailBreadcrumbs(spyState, getSecuritySolutionUrl);
  }

  if (isCloudSecurityPostureBenchmarksRoutes(spyState)) {
    return getCSPBreadcrumbs(spyState, getSecuritySolutionUrl);
  }

  return [];
};

const isNetworkRoutes = (spyState: RouteSpyState): spyState is NetworkRouteSpyState =>
  spyState.pageName === SecurityPageName.network;

const isHostsRoutes = (spyState: RouteSpyState): spyState is HostRouteSpyState =>
  spyState.pageName === SecurityPageName.hosts;

const isUsersRoutes = (spyState: RouteSpyState): spyState is UsersRouteSpyState =>
  spyState.pageName === SecurityPageName.users;

const isCaseRoutes = (spyState: RouteSpyState) => spyState.pageName === SecurityPageName.case;

const isKubernetesRoutes = (spyState: RouteSpyState) =>
  spyState.pageName === SecurityPageName.kubernetes;

const isAlertRoutes = (spyState: RouteSpyState): spyState is AlertDetailRouteSpyState =>
  spyState.pageName === SecurityPageName.alerts;

const isRulesRoutes = (spyState: RouteSpyState): spyState is AdministrationRouteSpyState =>
  spyState.pageName === SecurityPageName.rules ||
  spyState.pageName === SecurityPageName.rulesCreate;

const isExceptionRoutes = (spyState: RouteSpyState) =>
  spyState.pageName === SecurityPageName.exceptions;

const isCloudSecurityPostureBenchmarksRoutes = (spyState: RouteSpyState) =>
  spyState.pageName === SecurityPageName.cloudSecurityPostureBenchmarks;

const emptyLastBreadcrumbUrl = (breadcrumbs: ChromeBreadcrumb[]) => {
  const leadingBreadCrumbs = breadcrumbs.slice(0, -1);
  const lastBreadcrumb = last(breadcrumbs);

  if (lastBreadcrumb) {
    return [
      ...leadingBreadCrumbs,
      {
        ...lastBreadcrumb,
        href: '',
      },
    ];
  }

  return breadcrumbs;
};
