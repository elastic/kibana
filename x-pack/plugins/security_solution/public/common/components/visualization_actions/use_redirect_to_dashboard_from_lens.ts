/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { SecurityPageName } from '../../../../common';
import { useNavigateTo } from '../../lib/kibana';
import type { GetSecuritySolutionUrl } from '../link_to';

export const useRedirectToDashboardFromLens = ({
  getSecuritySolutionUrl,
}: {
  getSecuritySolutionUrl: GetSecuritySolutionUrl;
}) => {
  const { navigateTo } = useNavigateTo();

  const dashboardListingUrl = useMemo(
    () =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
      })}`,
    [getSecuritySolutionUrl]
  );

  const getEditOrCreateDashboardPath = useCallback(
    (id: string | null | undefined) => (id != null && id !== 'new' ? `${id}/edit` : `/create`),
    []
  );
  const getEditOrCreateDashboardUrl = useCallback(
    (id: string | null | undefined) =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: getEditOrCreateDashboardPath(id),
      })}`,
    [getEditOrCreateDashboardPath, getSecuritySolutionUrl]
  );

  const redirectTo = useCallback(
    (props) => {
      if (props.destination === 'listing') {
        navigateTo({ url: dashboardListingUrl });
      }
      if (props.destination === 'dashboard') {
        navigateTo({ url: getEditOrCreateDashboardUrl(props.id) });
      }
    },
    [dashboardListingUrl, getEditOrCreateDashboardUrl, navigateTo]
  );

  return {
    redirectTo,
    getEditOrCreateDashboardPath,
    getEditOrCreateDashboardUrl,
    dashboardListingUrl,
  };
};
