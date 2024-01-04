/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticEvent } from 'react';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { Dispatch } from 'redux';
import { SecurityPageName } from '../../../../app/types';
import type { RouteSpyState } from '../../../utils/route/types';
import { timelineActions } from '../../../../timelines/store';
import { TimelineId } from '../../../../../common/types/timeline';
import type { GetSecuritySolutionUrl } from '../../link_to';
import { useGetSecuritySolutionUrl } from '../../link_to';
import type { TelemetryClientStart } from '../../../lib/telemetry';
import { useKibana, useNavigateTo, type NavigateTo } from '../../../lib/kibana';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { updateBreadcrumbsNav } from '../../../breadcrumbs';
import { getAncestorLinksInfo } from '../../../links';
import { APP_NAME } from '../../../../../common/constants';
import { getTrailingBreadcrumbs } from './trailing_breadcrumbs';

export const useBreadcrumbsNav = () => {
  const dispatch = useDispatch();
  const { telemetry } = useKibana().services;
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
      leading: addOnClicksHandlers(leadingBreadcrumbs, dispatch, navigateTo, telemetry),
      trailing: addOnClicksHandlers(trailingBreadcrumbs, dispatch, navigateTo, telemetry),
    });
  }, [routeProps, getSecuritySolutionUrl, dispatch, navigateTo, telemetry]);
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
  navigateTo: NavigateTo,
  telemetry: TelemetryClientStart
): ChromeBreadcrumb[] =>
  breadcrumbs.map((breadcrumb) => ({
    ...breadcrumb,
    ...(breadcrumb.href &&
      !breadcrumb.onClick && {
        onClick: createOnClickHandler(
          breadcrumb.href,
          dispatch,
          navigateTo,
          telemetry,
          breadcrumb.text
        ),
      }),
  }));

const createOnClickHandler =
  (
    href: string,
    dispatch: Dispatch,
    navigateTo: NavigateTo,
    telemetry: TelemetryClientStart,
    title: React.ReactNode
  ) =>
  (ev: SyntheticEvent) => {
    ev.preventDefault();
    if (typeof title === 'string') {
      telemetry.reportBreadcrumbClicked({ title });
    }
    dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: false }));
    navigateTo({ url: href });
  };
