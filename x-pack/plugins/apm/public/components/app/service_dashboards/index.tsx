/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiLoadingLogo,
} from '@elastic/eui';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  AwaitingDashboardAPI,
  DashboardCreationOptions,
  DashboardRenderer,
} from '@kbn/dashboard-plugin/public';
import { EmptyDashboards } from './empty_dashboards';
import { GotoDashboard, LinkDashboard } from './actions';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useApmParams } from '../../../hooks/use_apm_params';
import { SavedServiceDashboard } from '../../../../common/service_dashboards';
import { ContextMenu } from './context_menu';
import { UnlinkDashboard } from './actions/unlink_dashboard';
import { EditDashboard } from './actions/edit_dashboard';
import { DashboardSelector } from './dashboard_selector';
import { useApmDataView } from '../../../hooks/use_apm_data_view';
import { getFilters } from '../metrics/static_dashboard';

export function ServiceDashboards() {
  const {
    path: { serviceName },
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/dashboards');
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();
  const [currentDashboard, setCurrentDashboard] =
    useState<SavedServiceDashboard>();
  const { dataView } = useApmDataView();

  const { data, status, refetch } = useFetcher(
    (callApmApi) => {
      if (serviceName) {
        return callApmApi(
          `GET /internal/apm/services/{serviceName}/dashboards`,
          {
            params: {
              path: { serviceName },
            },
          }
        );
      }
    },
    [serviceName]
  );

  const serviceDashboards = data?.serviceDashboards ?? [];

  useEffect(() => {
    // preselect dashboard
    setCurrentDashboard(data?.serviceDashboards[0]);
  }, [serviceDashboards]);

  const getCreationOptions =
    useCallback((): Promise<DashboardCreationOptions> => {
      const getInitialInput = () => ({
        viewMode: ViewMode.VIEW,
        timeRange: { from: rangeFrom, to: rangeTo },
      });
      return Promise.resolve<DashboardCreationOptions>({ getInitialInput });
    }, []);

  useEffect(() => {
    if (!dashboard) return;

    dashboard.updateInput({
      timeRange: { from: rangeFrom, to: rangeTo },
      query: { query: kuery, language: 'kuery' },
    });
  }, [kuery, dashboard, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!dashboard || !dataView) return;

    dashboard.updateInput({
      filters:
        dataView && currentDashboard?.useContextFilter
          ? getFilters(serviceName, environment, dataView)
          : [],
    });
  }, [dataView, serviceName, environment, dashboard, currentDashboard]);

  const handleOnChange = (selectedId?: string) => {
    setCurrentDashboard(
      serviceDashboards.find(
        ({ dashboardSavedObjectId }) => dashboardSavedObjectId === selectedId
      )
    );
  };

  return (
    <EuiPanel hasBorder={true}>
      {status === FETCH_STATUS.LOADING ? (
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
          title={
            <h4>
              {i18n.translate(
                'xpack.apm.serviceDashboards.loadingServiceDashboards',
                {
                  defaultMessage: 'Loading service dashboard',
                }
              )}
            </h4>
          }
        />
      ) : status === FETCH_STATUS.SUCCESS && serviceDashboards.length > 0 ? (
        <>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="xs"
            alignItems="center"
          >
            <EuiFlexItem grow={true}>
              <EuiTitle size="s">
                <h3>{currentDashboard?.dashboardTitle}</h3>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <DashboardSelector
                serviceDashboards={serviceDashboards}
                handleOnChange={handleOnChange}
                currentDashboard={currentDashboard}
              />
            </EuiFlexItem>

            {currentDashboard && (
              <EuiFlexItem grow={false}>
                <ContextMenu
                  items={[
                    <LinkDashboard
                      emptyButton={true}
                      onRefresh={refetch}
                      serviceDashboards={serviceDashboards}
                    />,
                    <GotoDashboard currentDashboard={currentDashboard} />,
                    <EditDashboard
                      currentDashboard={currentDashboard}
                      onRefresh={refetch}
                    />,
                    <UnlinkDashboard
                      currentDashboard={currentDashboard}
                      onRefresh={refetch}
                    />,
                  ]}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiSpacer size="l" />
            {currentDashboard && (
              <DashboardRenderer
                savedObjectId={currentDashboard.dashboardSavedObjectId}
                getCreationOptions={getCreationOptions}
                ref={setDashboard}
              />
            )}
          </EuiFlexItem>
        </>
      ) : (
        <EmptyDashboards actions={<LinkDashboard onRefresh={refetch} />} />
      )}
    </EuiPanel>
  );
}
