/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { REQUEST_NAMES, useFetch } from '../../common/hooks/use_fetch';
import { useKibana } from '../../common/lib/kibana';
import { fetchTags } from '../../common/containers/tags/api';
import { MANAGED_TAG_NAME } from '../../../common/constants';

export const isManagedTag = ({ name }: { name: string }) => name === MANAGED_TAG_NAME;

export const useDashboardRenderer = () => {
  const { savedObjectsTagging } = useKibana().services;

  const [dashboardContainer, setDashboardContainer] = useState<DashboardAPI>();
  const [hasManagedTag, setHasManagedTag] = useState<boolean>();

  const {
    fetch: fetchDashboardTags,
    data: dashboardTags,
    isLoading,
    error,
  } = useFetch(REQUEST_NAMES.FETCH_DASHBOARD_TAGS, fetchTags);

  const handleDashboardLoaded = useCallback(
    async (container: DashboardAPI) => {
      setDashboardContainer(container);
      const tagIds = container?.getExplicitInput().tags;
      if (savedObjectsTagging && tagIds?.length > 0) {
        await fetchDashboardTags({ tagIds, savedObjectsTaggingClient: savedObjectsTagging.client });
      }
    },
    [fetchDashboardTags, savedObjectsTagging]
  );

  useEffect(() => {
    if (!isLoading) {
      if (dashboardTags != null && dashboardTags.some(isManagedTag) && !error) {
        setHasManagedTag(true);
      } else {
        setHasManagedTag(false);
      }
    }
  }, [hasManagedTag, dashboardTags, error, isLoading]);

  return useMemo(
    () => ({
      dashboard: {
        container: dashboardContainer,
        isManaged: hasManagedTag,
      },
      handleDashboardLoaded,
    }),
    [dashboardContainer, handleDashboardLoaded, hasManagedTag]
  );
};
