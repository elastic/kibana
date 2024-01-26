/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect, useMemo } from 'react';
import { SecurityPageName } from '../../../common/constants';
import { useUrlStateQueryParams } from '../components/navigation/use_url_state_query_params';
import { useKibana, useAppUrl } from '../lib/kibana';

export const dashboardRequestBody = (title: string) => ({
  type: 'dashboard',
  search: `"${title}"`,
  fields: ['title'],
});

export const useDashboardHref = ({ title }: { title: string }): string | undefined => {
  const { dashboard } = useKibana().services;
  const { getAppUrl } = useAppUrl();
  const [dashboardId, setDashboardId] = useState<string | undefined>();

  const params = useUrlStateQueryParams(SecurityPageName.dashboards);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (dashboard && title) {
        const findDashboardsService = await dashboard?.findDashboardsService();
        const { id } = (await findDashboardsService.findByTitle(title)) ?? {};
        if (!ignore) {
          setDashboardId(id);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [dashboard, title]);

  return useMemo(() => {
    if (dashboardId) {
      return getAppUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: `${dashboardId}${params}`,
      });
    } else {
      return undefined;
    }
  }, [dashboardId, getAppUrl, params]);
};
