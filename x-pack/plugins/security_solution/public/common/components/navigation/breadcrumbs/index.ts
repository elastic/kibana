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
import { getTrailingBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../../explore/hosts/pages/details/utils';
import { getTrailingBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../../explore/network/pages/details/utils';
import { getTrailingBreadcrumbs as getDetectionRulesBreadcrumbs } from '../../../../detections/pages/detection_engine/rules/utils';
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
import { getLeadingBreadcrumbsForSecurityPage } from './get_breadcrumbs_for_page';
import type { GetSecuritySolutionUrl } from '../../link_to';
import { useGetSecuritySolutionUrl } from '../../link_to';
import { TELEMETRY_EVENT, track } from '../../../lib/telemetry';
import { useKibana } from '../../../lib/kibana';
import { useRouteSpy } from '../../../utils/route/use_route_spy';

export const useBreadcrumbs = ({ isEnabled }: { isEnabled: boolean }) => {
  const dispatch = useDispatch();
  const [routeProps] = useRouteSpy();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const {
    chrome: { setBreadcrumbs },
    application: { navigateToUrl },
  } = useKibana().services;

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const breadcrumbs = getBreadcrumbsForRoute(routeProps, getSecuritySolutionUrl);
    if (!breadcrumbs) {
      return;
    }
    setBreadcrumbs(
      breadcrumbs.map((breadcrumb) => ({
        ...breadcrumb,
        ...(breadcrumb.href && !breadcrumb.onClick
          ? {
              onClick: (ev) => {
                ev.preventDefault();
                const trackedPath = breadcrumb.href?.split('?')[0] ?? 'unknown';
                track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.BREADCRUMB}${trackedPath}`);
                dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: false }));

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                navigateToUrl(breadcrumb.href!);
              },
            }
          : {}),
      }))
    );
  }, [routeProps, isEnabled, dispatch, getSecuritySolutionUrl, setBreadcrumbs, navigateToUrl]);
};

export const getBreadcrumbsForRoute = (
  spyState: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] | null => {
  if (
    !spyState?.pageName ||
    // cases manages its own breadcrumbs, return null
    spyState.pageName === SecurityPageName.case
  ) {
    return null;
  }

  const leadingBreadcrumbs = getLeadingBreadcrumbsForSecurityPage(
    spyState.pageName,
    getSecuritySolutionUrl
  );

  return emptyLastBreadcrumbUrl([
    ...leadingBreadcrumbs,
    ...getTrailingBreadcrumbsForRoutes(spyState, getSecuritySolutionUrl),
  ]);
};

const getTrailingBreadcrumbsForRoutes = (
  spyState: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
  switch (spyState.pageName) {
    case SecurityPageName.hosts:
      return getHostDetailsBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.network:
      return getIPDetailsBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.users:
      return getUsersBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.rules:
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
