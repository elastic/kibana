/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { last } from 'lodash/fp';
import { useDispatch } from 'react-redux';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { METRIC_TYPE } from '@kbn/analytics';
import type { Dispatch } from 'redux';
import { getTrailingBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../../explore/hosts/pages/details/utils';
import { getTrailingBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../../explore/network/pages/details/utils';
import { getTrailingBreadcrumbs as getDetectionRulesBreadcrumbs } from '../../../../detections/pages/detection_engine/rules/breadcrumbs';
import { getTrailingBreadcrumbs as geExceptionsBreadcrumbs } from '../../../../exceptions/utils/pages.utils';
import { getTrailingBreadcrumbs as getCSPBreadcrumbs } from '../../../../cloud_security_posture/breadcrumbs';
import { getTrailingBreadcrumbs as getUsersBreadcrumbs } from '../../../../explore/users/pages/details/utils';
import { getTrailingBreadcrumbs as getKubernetesBreadcrumbs } from '../../../../kubernetes/pages/utils/breadcrumbs';
import { getTrailingBreadcrumbs as getAlertDetailBreadcrumbs } from '../../../../detections/pages/alert_details/utils/breadcrumbs';
import { getTrailingBreadcrumbs as getDashboardBreadcrumbs } from '../../../../dashboards/pages/utils';
import { SecurityPageName } from '../../../../app/types';
import type { RouteSpyState } from '../../../utils/route/types';
import { timelineActions } from '../../../../timelines/store/timeline';
import { TimelineId } from '../../../../../common/types/timeline';
import type { GetSecuritySolutionUrl } from '../../link_to';
import { useGetSecuritySolutionUrl } from '../../link_to';
import { TELEMETRY_EVENT, track } from '../../../lib/telemetry';
import { useNavigateTo, type NavigateTo } from '../../../lib/kibana';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { updateBreadcrumbsNav } from '../../../breadcrumbs';
import { getAncestorLinksInfo } from '../../../links';
import { APP_NAME } from '../../../../../common/constants';

export const useBreadcrumbsNav = () => {
  const dispatch = useDispatch();
  const [routeProps] = useRouteSpy();
  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  useEffect(() => {
    const leadingBreadcrumbs = getLeadingBreadcrumbs(routeProps, getSecuritySolutionUrl);
    const trailingBreadcrumbs = getTrailingBreadcrumbs(routeProps, getSecuritySolutionUrl);

    updateBreadcrumbsNav({
      leading: createOnClicks(leadingBreadcrumbs, dispatch, navigateTo),
      trailing: createOnClicks(trailingBreadcrumbs, dispatch, navigateTo),
    });
  }, [routeProps, getSecuritySolutionUrl, dispatch, navigateTo]);
};

const createOnClicks = (
  breadcrumbs: ChromeBreadcrumb[],
  dispatch: Dispatch,
  navigateTo: NavigateTo
): ChromeBreadcrumb[] =>
  breadcrumbs.map((breadcrumb) => ({
    ...breadcrumb,
    ...(breadcrumb.href &&
      !breadcrumb.onClick && {
        onClick: createBreadcrumbOnClick(breadcrumb.href, dispatch, navigateTo),
      }),
  }));

const createBreadcrumbOnClick =
  (href: string, dispatch: Dispatch, navigateTo: NavigateTo): ChromeBreadcrumb['onClick'] =>
  (ev) => {
    ev.preventDefault();
    const trackedPath = href.split('?')[0];
    track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.BREADCRUMB}${trackedPath}`);
    dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: false }));
    navigateTo({ url: href });
  };

const getLeadingBreadcrumbs = (
  { pageName }: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
) => {
  if (
    !pageName ||
    pageName === SecurityPageName.case // cases manages its own breadcrumbs
  ) {
    return [];
  }

  const landingBreadcrumb: ChromeBreadcrumb = {
    text: APP_NAME,
    href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.landing }),
  };

  const breadcrumbs: ChromeBreadcrumb[] = getAncestorLinksInfo(pageName).map(({ title, id }) => ({
    text: title,
    href: getSecuritySolutionUrl({ deepLinkId: id }),
  }));

  return [landingBreadcrumb, ...breadcrumbs];
};

const getTrailingBreadcrumbs = (
  spyState: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
) => {
  switch (spyState.pageName) {
    case SecurityPageName.hosts:
      return getHostDetailsBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.network:
      return getIPDetailsBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.users:
      return getUsersBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.rules:
    case SecurityPageName.rulesAdd:
    case SecurityPageName.rulesCreate:
      return getDetectionRulesBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.exceptions:
      return geExceptionsBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.kubernetes:
      return getKubernetesBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.alerts:
      return getAlertDetailBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.cloudSecurityPostureBenchmarks:
      return getCSPBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.dashboards:
      return getDashboardBreadcrumbs(spyState);
  }
  return [];
};

const emptyLastBreadcrumbUrl = (breadcrumbs: ChromeBreadcrumb[]) => {
  const lastBreadcrumb = last(breadcrumbs);
  if (lastBreadcrumb) {
    return [
      ...breadcrumbs.slice(0, -1),
      {
        ...lastBreadcrumb,
        href: '',
      },
    ];
  }
  return breadcrumbs;
};
