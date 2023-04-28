/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo } from 'react';
import type { TiDataSources } from './use_ti_data_sources';
import { useKibana } from '../../../common/lib/kibana';
import { getDashboardsByTagIds } from '../../../common/containers/dashboards/api';
import { getTagsByName } from '../../../common/containers/tags/api';
import { useFetch, REQUEST_NAMES } from '../../../common/hooks/use_fetch';

const CTI_TAG_NAME = 'threat intel';

const useCtiInstalledDashboards = () => {
  const { http } = useKibana().services;

  const {
    fetch,
    data: dashboards,
    isLoading,
  } = useFetch(REQUEST_NAMES.CTI_TAGS, async (tagName: string) => {
    const ctiTags = await getTagsByName(http, tagName);
    return getDashboardsByTagIds(
      http,
      ctiTags.map((tag) => tag.id)
    );
  });

  useEffect(() => {
    fetch(CTI_TAG_NAME);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { dashboards, isLoading };
};

export const useCtiDashboardLinks = ({
  to,
  from,
  tiDataSources = [],
}: {
  to: string;
  from: string;
  tiDataSources?: TiDataSources[];
}) => {
  const dashboardLocator = useKibana().services.dashboard?.locator;
  const { dashboards } = useCtiInstalledDashboards();

  const listItems = useMemo(() => {
    const installedDashboardIds = dashboards?.map(({ id }) => id) ?? [];

    return tiDataSources.map((tiDataSource) => {
      let path = '';
      if (
        dashboardLocator &&
        tiDataSource.dashboardId &&
        installedDashboardIds.includes(tiDataSource.dashboardId)
      ) {
        path = dashboardLocator.getRedirectUrl({
          dashboardId: tiDataSource.dashboardId,
          timeRange: {
            to,
            from,
          },
        });
      }

      return {
        title: tiDataSource.name,
        count: tiDataSource.count,
        path,
      };
    });
  }, [dashboards, tiDataSources, dashboardLocator, to, from]);

  return { listItems };
};
