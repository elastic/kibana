/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { SecurityPageName } from '../../../../common';
import { useGetSecuritySolutionUrl } from '../link_to';
import { useNavigateTo } from '../../lib/kibana';

export const useRedirectToDashboardFromLens = () => {
  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const dashboardListingUrl = useMemo(
    () =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
      })}`,
    [getSecuritySolutionUrl]
  );
  const getEditOrCreateDashboardUrl = useCallback(
    (id: string | undefined) =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: id ? `${id}/edit` : `/create`,
      })}`,
    [getSecuritySolutionUrl]
  );

  const redirectTo = useCallback(
    (props) => {
      if (props.destination === 'listing') {
        navigateTo({ url: dashboardListingUrl });
      }
      if (props.destination === 'dashboard' && props.id) {
        navigateTo({ url: getEditOrCreateDashboardUrl(props.id) });
      }
    },
    [dashboardListingUrl, getEditOrCreateDashboardUrl, navigateTo]
  );

  return redirectTo;
};
