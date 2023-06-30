/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { METRIC_TYPE } from '@kbn/analytics';
import type { Dispatch } from 'redux';
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
import { getTrailingBreadcrumbs } from './trailing_breadcrumbs';

export const useBreadcrumbsNav = () => {
  const dispatch = useDispatch();
  const [routeProps] = useRouteSpy();
  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  useEffect(() => {
    // cases manages its own breadcrumbs
    if (!routeProps.pageName || routeProps.pageName === SecurityPageName.case) {
      return;
    }

    const leadingBreadcrumbs = getLeadingBreadcrumbs(routeProps, getSecuritySolutionUrl);
    const trailingBreadcrumbs = getTrailingBreadcrumbs(routeProps, getSecuritySolutionUrl);

    updateBreadcrumbsNav({
      leading: addOnClicksHandlers(leadingBreadcrumbs, dispatch, navigateTo),
      trailing: addOnClicksHandlers(trailingBreadcrumbs, dispatch, navigateTo),
    });
  }, [routeProps, getSecuritySolutionUrl, dispatch, navigateTo]);
};

const getLeadingBreadcrumbs = (
  { pageName }: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
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

const addOnClicksHandlers = (
  breadcrumbs: ChromeBreadcrumb[],
  dispatch: Dispatch,
  navigateTo: NavigateTo
): ChromeBreadcrumb[] =>
  breadcrumbs.map((breadcrumb) => ({
    ...breadcrumb,
    ...(breadcrumb.href &&
      !breadcrumb.onClick && {
        onClick: createOnClickHandler(breadcrumb.href, dispatch, navigateTo),
      }),
  }));

const createOnClickHandler =
  (href: string, dispatch: Dispatch, navigateTo: NavigateTo): ChromeBreadcrumb['onClick'] =>
  (ev) => {
    ev.preventDefault();
    const trackedPath = href.split('?')[0];
    track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.BREADCRUMB}${trackedPath}`);
    dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: false }));
    navigateTo({ url: href });
  };
