/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { DASHBOARD_LOCATORS_IDS } from '../../../../../../../common/constants';

import { useDashboardLocator, useStartServices } from '../../../../hooks';

const useDashboardExists = (dashboardId: string) => {
  const [dashboardExists, setDashboardExists] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  const { dashboard: dashboardPlugin } = useStartServices();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const findDashboardsService = await dashboardPlugin.findDashboardsService();
        const [dashboard] = await findDashboardsService.findByIds([dashboardId]);
        setLoading(false);
        setDashboardExists(dashboard?.status === 'success');
      } catch (e) {
        setLoading(false);
        setDashboardExists(false);
      }
    };

    fetchDashboard();
  }, [dashboardId, dashboardPlugin]);

  return { dashboardExists, loading };
};

export const DashboardsButtons: React.FunctionComponent = () => {
  const dashboardLocator = useDashboardLocator();

  const getDashboardHref = (dashboardId: string) => {
    return dashboardLocator?.getRedirectUrl({ dashboardId }) || '';
  };

  const { dashboardExists, loading: dashboardLoading } = useDashboardExists(
    DASHBOARD_LOCATORS_IDS.ELASTIC_AGENT_OVERVIEW
  );

  if (dashboardLoading || !dashboardExists) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="dashboardApp"
            href={getDashboardHref(DASHBOARD_LOCATORS_IDS.ELASTIC_AGENT_OVERVIEW)}
            data-test-subj="ingestOverviewLinkButton"
          >
            <FormattedMessage
              id="xpack.fleet.agentList.ingestOverviewlinkButton"
              defaultMessage="Ingest Overview Metrics"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="dashboardApp"
            href={getDashboardHref(DASHBOARD_LOCATORS_IDS.ELASTIC_AGENT_AGENT_INFO)}
            data-test-subj="agentInfoLinkButton"
          >
            <FormattedMessage
              id="xpack.fleet.agentList.agentInfoLinkButton"
              defaultMessage="Agent Info Metrics"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
