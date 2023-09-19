/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { EmptyDashboards } from './empty_dashboards';
import { GotoDashboard, LinkDashboard } from './actions';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useApmParams } from '../../../hooks/use_apm_params';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  AwaitingDashboardAPI,
  DashboardCreationOptions,
  DashboardRenderer,
} from '@kbn/dashboard-plugin/public';
import { SavedServiceDashboard } from '../../../../common/service_dashboards';
import { ContextMenu } from './context_menu';
import { UnlinkDashboard } from './actions/unlink_dashboard';
import { EditDashboard } from './actions/edit_dashboard';

export function ServiceDashboards() {
  const {
    path: { serviceName },
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/dashboards');
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();
  const [selectedDashboard, setSelectedDashboard] =
    useState<SavedServiceDashboard>();
  const [isModalVisible, setIsModalVisible] = useState(false);

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

  const getCreationOptions =
    useCallback((): Promise<DashboardCreationOptions> => {
      const getInitialInput = () => ({
        viewMode: ViewMode.VIEW,
        timeRange: { from: rangeFrom, to: rangeTo },
        query: { query: kuery, language: 'kuery' },
      });
      return Promise.resolve<DashboardCreationOptions>({ getInitialInput });
    }, [rangeFrom, rangeTo, kuery, selectedDashboard]);

  const serviceDashboards = data?.serviceDashboards ?? [];

  useEffect(() => {
    if (!dashboard) return;

    dashboard.updateInput({
      viewMode: ViewMode.VIEW,
      timeRange: { from: rangeFrom, to: rangeTo },
      // TODO useContextFilter
      query: { query: kuery, language: 'kuery' },
    });
  }, [
    serviceDashboards,
    kuery,
    serviceName,
    environment,
    rangeFrom,
    rangeTo,
    selectedDashboard,
  ]);

  const handleOnChange = (selectedId: string) => {
    setSelectedDashboard(
      serviceDashboards.find(
        ({ dashboardSavedObjectId }) => dashboardSavedObjectId === selectedId
      )
    );
  };

  return (
    <EuiPanel hasBorder={true}>
      {status !== FETCH_STATUS.LOADING && serviceDashboards.length > 0 ? (
        <>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {selectedDashboard?.dashboardTitle}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ContextMenu
                handleOnChange={handleOnChange}
                selectedDashboard={selectedDashboard}
                serviceDashboards={data?.serviceDashboards}
                items={[
                  <LinkDashboard
                    emptyButton={true}
                    isModalVisible={isModalVisible}
                    setIsModalVisible={setIsModalVisible}
                    onRefresh={refetch}
                  />,
                  <GotoDashboard selectedDashboard={selectedDashboard} />,
                  <EditDashboard selectedDashboard={selectedDashboard} />,
                  <UnlinkDashboard
                    selectedDashboard={selectedDashboard}
                    onRefresh={refetch}
                  />,
                ]}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          {selectedDashboard && (
            <DashboardRenderer
              savedObjectId={selectedDashboard.dashboardSavedObjectId}
              getCreationOptions={getCreationOptions}
              ref={setDashboard}
            />
          )}
        </>
      ) : (
        <EmptyDashboards
          actions={
            <LinkDashboard
              isModalVisible={isModalVisible}
              setIsModalVisible={setIsModalVisible}
              onRefresh={refetch}
            />
          }
        />
      )}
    </EuiPanel>
  );
}
