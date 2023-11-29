/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';

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
import { SerializableRecord } from '@kbn/utility-types';

import { EmptyDashboards } from './empty_dashboards';
import { GotoDashboard, LinkDashboard } from './actions';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useApmParams } from '../../../hooks/use_apm_params';
import { SavedApmCustomDashboard } from '../../../../common/custom_dashboards';
import { ContextMenu } from './context_menu';
import { UnlinkDashboard } from './actions/unlink_dashboard';
import { EditDashboard } from './actions/edit_dashboard';
import { DashboardSelector } from './dashboard_selector';
import { useApmDataView } from '../../../hooks/use_apm_data_view';
import { getFilters } from '../metrics/static_dashboard';
import { useDashboardFetcher } from '../../../hooks/use_dashboards_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { APM_APP_LOCATOR_ID } from '../../../locator/service_detail_locator';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

export interface MergedServiceDashboard extends SavedApmCustomDashboard {
  title: string;
}

export function ServiceDashboards() {
  const {
    path: { serviceName },
    query: { environment, kuery, rangeFrom, rangeTo, dashboardId },
  } = useApmParams('/services/{serviceName}/dashboards');
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();
  const [serviceDashboards, setServiceDashboards] = useState<
    MergedServiceDashboard[]
  >([]);
  const [currentDashboard, setCurrentDashboard] =
    useState<MergedServiceDashboard>();
  const { data: allAvailableDashboards } = useDashboardFetcher();
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { dataView } = useApmDataView();
  const { share } = useApmPluginContext();

  const { data, status, refetch } = useFetcher(
    (callApmApi) => {
      if (serviceName) {
        return callApmApi(
          `GET /internal/apm/services/{serviceName}/dashboards`,
          {
            isCachable: false,
            params: {
              path: { serviceName },
              query: { start, end },
            },
          }
        );
      }
    },
    [serviceName, start, end]
  );

  useEffect(() => {
    const filteredServiceDashbords = (data?.serviceDashboards ?? []).reduce(
      (
        result: MergedServiceDashboard[],
        serviceDashboard: SavedApmCustomDashboard
      ) => {
        const matchedDashboard = allAvailableDashboards.find(
          ({ id }) => id === serviceDashboard.dashboardSavedObjectId
        );
        if (matchedDashboard) {
          result.push({
            title: matchedDashboard.attributes.title,
            ...serviceDashboard,
          });
        }
        return result;
      },
      []
    );

    setServiceDashboards(filteredServiceDashbords);
  }, [allAvailableDashboards, data?.serviceDashboards]);

  const getCreationOptions =
    useCallback((): Promise<DashboardCreationOptions> => {
      const getInitialInput = () => ({
        viewMode: ViewMode.VIEW,
        timeRange: { from: rangeFrom, to: rangeTo },
      });
      return Promise.resolve<DashboardCreationOptions>({ getInitialInput });
    }, [rangeFrom, rangeTo]);

  useEffect(() => {
    if (!dashboard) return;

    dashboard.updateInput({
      filters:
        dataView &&
        currentDashboard?.serviceEnvironmentFilterEnabled &&
        currentDashboard?.serviceNameFilterEnabled
          ? getFilters(serviceName, environment, dataView)
          : [],
      timeRange: { from: rangeFrom, to: rangeTo },
      query: { query: kuery, language: 'kuery' },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataView,
    serviceName,
    environment,
    kuery,
    dashboard,
    rangeFrom,
    rangeTo,
  ]);

  const getLocatorParams = useCallback(
    (params) => {
      return {
        serviceName,
        dashboardId: params.dashboardId,
        query: {
          environment,
          kuery,
          rangeFrom,
          rangeTo,
        },
      };
    },
    [serviceName, environment, kuery, rangeFrom, rangeTo]
  );

  const locator = useMemo(() => {
    const baseLocator = share.url.locators.get(APM_APP_LOCATOR_ID);
    if (!baseLocator) return;

    return {
      ...baseLocator,
      getRedirectUrl: (params: SerializableRecord) =>
        baseLocator.getRedirectUrl(getLocatorParams(params)),
      navigate: (params: SerializableRecord) =>
        baseLocator.navigate(getLocatorParams(params)),
    };
  }, [share, getLocatorParams]);

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
      ) : status === FETCH_STATUS.SUCCESS && serviceDashboards?.length > 0 ? (
        <>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="xs"
            alignItems="center"
          >
            <EuiFlexItem grow={true}>
              <EuiTitle size="s">
                <h3>{currentDashboard?.title}</h3>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <DashboardSelector
                currentDashboardId={dashboardId}
                serviceDashboards={serviceDashboards}
                setCurrentDashboard={setCurrentDashboard}
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
                      defaultDashboard={serviceDashboards[0]}
                      onRefresh={refetch}
                    />,
                  ]}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiSpacer size="l" />
            {dashboardId && (
              <DashboardRenderer
                locator={locator}
                savedObjectId={dashboardId}
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
