/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetPackageInfoByKeyQuery, useDashboardLocator } from '../../../../hooks';
import type { Agent } from '../../../../types';
import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  DASHBOARD_LOCATORS_IDS,
} from '../../../../../../../common/constants';

export function useAgentDashboardLink(agent: Agent) {
  const { isLoading, data } = useGetPackageInfoByKeyQuery(FLEET_ELASTIC_AGENT_PACKAGE);

  const isInstalled = data?.item.status === 'installed';
  const dashboardLocator = useDashboardLocator();

  const link = dashboardLocator?.getRedirectUrl({
    dashboardId: DASHBOARD_LOCATORS_IDS.ELASTIC_AGENT_AGENT_METRICS,
    query: {
      language: 'kuery',
      query: `elastic_agent.id:${agent.id}`,
    },
  });

  return {
    isLoading,
    isInstalled,
    link,
  };
}
