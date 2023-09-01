/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { CREATE_DASHBOARD_TITLE } from '../pages/translations';
import { DASHBOARD_NOT_FOUND_TITLE } from '../pages/details/translations';
import { REQUEST_NAMES, useFetch } from '../../common/hooks/use_fetch';
import { useKibana } from '../../common/lib/kibana';
import { fetchTags, isManagedTag } from '../../common/containers/tags/api';

type DashboardDetails = Record<string, string>;

export const useDashboardRenderer = (savedObjectId: string | undefined) => {
  const { savedObjectsTagging } = useKibana().services;

  const [dashboardContainer, setDashboardContainer] = useState<DashboardAPI>();
  const [dashboardDetails, setDashboardDetails] = useState<DashboardDetails | undefined>();
  const [isManaged, setIsManaged] = useState<boolean>();

  const { fetch: fetchDashboardTags, data: dashboardTags } = useFetch(
    REQUEST_NAMES.FETCH_DASHBOARD_TAGS,
    fetchTags
  );
  const onDashboardContainerLoaded = useCallback(
    (dashboard: DashboardAPI) => {
      if (!savedObjectId) {
        setDashboardDetails({ title: CREATE_DASHBOARD_TITLE });
        return;
      }

      if (dashboard) {
        const title = dashboard.getTitle().trim();
        if (title) {
          setDashboardDetails({ title });
        } else {
          setDashboardDetails({ title: DASHBOARD_NOT_FOUND_TITLE });
        }
      }
    },
    [savedObjectId]
  );

  const handleDashboardLoaded = useCallback(
    async (container: DashboardAPI) => {
      setDashboardContainer(container);
      onDashboardContainerLoaded(container);
      const tagIds = container?.getExplicitInput().tags;
      if (savedObjectsTagging) {
        await fetchDashboardTags({ tagIds, savedObjectsTaggingClient: savedObjectsTagging.client });
        if (dashboardTags?.some(isManagedTag)) {
          setIsManaged(true);
        } else {
          setIsManaged(false);
        }
      }
    },
    [dashboardTags, fetchDashboardTags, onDashboardContainerLoaded, savedObjectsTagging]
  );

  return useMemo(
    () => ({
      dashboard: { container: dashboardContainer, details: dashboardDetails, isManaged },
      handleDashboardLoaded,
    }),
    [dashboardContainer, dashboardDetails, handleDashboardLoaded, isManaged]
  );
};
