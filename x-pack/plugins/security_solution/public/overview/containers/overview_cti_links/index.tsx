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
import { SecurityPageName } from '../../../../common/constants';
import { useGetSecuritySolutionUrl } from '../../../common/components/link_to';

const CTI_TAG_NAME = 'threat intel';

const useCtiInstalledDashboards = () => {
  const { http } = useKibana().services;

  const {
    data: ctiTags,
    isLoading: isLoadingTags,
    error: errorTags,
  } = useFetch(REQUEST_NAMES.CTI_TAGS, getTagsByName, {
    initialParameters: { http, tagName: CTI_TAG_NAME },
  });

  const {
    fetch: fetchDashboards,
    data: dashboards,
    isLoading: isLoadingDashboards,
  } = useFetch(REQUEST_NAMES.CTI_TAGS, getDashboardsByTagIds);

  useEffect(() => {
    if (!isLoadingTags && !errorTags && ctiTags?.length) {
      fetchDashboards({ http, tagIds: ctiTags.map((tag) => tag.id) });
    }
  }, [errorTags, fetchDashboards, http, isLoadingTags, ctiTags]);

  return { dashboards, isLoading: isLoadingDashboards || isLoadingTags };
};

export const useCtiDashboardLinks = ({
  tiDataSources = [],
}: {
  tiDataSources?: TiDataSources[];
}) => {
  const { dashboards } = useCtiInstalledDashboards();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  const listItems = useMemo(() => {
    const installedDashboardIds = dashboards?.map(({ id }) => id) ?? [];

    return tiDataSources.map((tiDataSource) => {
      let path = '';
      if (tiDataSource.dashboardId && installedDashboardIds.includes(tiDataSource.dashboardId)) {
        path = `${getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.dashboards,
          path: tiDataSource.dashboardId,
        })}`;
      }

      return {
        title: tiDataSource.name,
        count: tiDataSource.count,
        path,
      };
    });
  }, [dashboards, tiDataSources, getSecuritySolutionUrl]);

  return { listItems };
};
