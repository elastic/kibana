/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo, useRef } from 'react';
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
  const abortController = useRef(new AbortController());

  const {
    fetch,
    data: dashboards,
    isLoading,
  } = useFetch(REQUEST_NAMES.CTI_TAGS, async (tagName: string) => {
    const ctiTags = await getTagsByName(http, tagName, abortController.current.signal);
    return getDashboardsByTagIds(
      http,
      ctiTags.map((tag) => tag.id)
    );
  });

  useEffect(() => {
    fetch(CTI_TAG_NAME);
  }, [fetch]);

  return { dashboards, isLoading };
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
