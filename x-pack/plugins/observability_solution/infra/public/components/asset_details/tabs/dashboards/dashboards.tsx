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

import type { DashboardItem } from '@kbn/dashboard-plugin/common/content_management';
import type {
  InfraSavedCustomDashboard,
  DashboardItemWithTitle,
} from '../../../../../common/custom_dashboards';

import { EmptyDashboards } from './empty_dashboards';
import { EditDashboard, GotoDashboardLink, LinkDashboard, UnlinkDashboard } from './actions';
import { useFetchCustomDashboards } from '../../hooks/use_fetch_custom_dashboards';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { FETCH_STATUS, useDashboardFetcher } from '../../hooks/use_dashboards_fetcher';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { DashboardSelector } from './dashboard_selector';
import { ContextMenu } from './context_menu';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';
import { getFilterByAssetName } from './build_asset_name_filter';

export function Dashboards() {
  const { dateRange } = useDatePickerContext();
  const { asset } = useAssetDetailsRenderPropsContext();
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();
  const [customDashboards, setCustomDashboards] = useState<DashboardItemWithTitle[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<DashboardItemWithTitle>();
  const { data: allAvailableDashboards, status } = useDashboardFetcher();
  const { metrics } = useDataViewsContext();
  const [urlState, setUrlState] = useAssetDetailsUrlState();

  const { dashboards, loading, reload } = useFetchCustomDashboards({ assetType: asset.type });

  useEffect(() => {
    const allAvailableDashboardsMap = new Map<string, DashboardItem>();
    allAvailableDashboards.forEach((availableDashboard) => {
      allAvailableDashboardsMap.set(availableDashboard.id, availableDashboard);
    });
    const filteredCustomDashboards =
      dashboards?.reduce<DashboardItemWithTitle[]>(
        (result: DashboardItemWithTitle[], customDashboard: InfraSavedCustomDashboard) => {
          const matchedDashboard = allAvailableDashboardsMap.get(
            customDashboard.dashboardSavedObjectId
          );
          if (matchedDashboard) {
            result.push({
              title: matchedDashboard.attributes.title,
              ...customDashboard,
            });
          }
          return result;
        },
        []
      ) ?? [];
    setCustomDashboards(filteredCustomDashboards);
    // set a default dashboard if there is no selected dashboard
    if (!urlState?.dashboardId) {
      setUrlState({
        dashboardId:
          currentDashboard?.dashboardSavedObjectId ??
          filteredCustomDashboards[0]?.dashboardSavedObjectId,
      });
    }
  }, [
    allAvailableDashboards,
    currentDashboard?.dashboardSavedObjectId,
    dashboards,
    setUrlState,
    urlState?.dashboardId,
  ]);

  const getCreationOptions = useCallback((): Promise<DashboardCreationOptions> => {
    const getInitialInput = () => ({
      viewMode: ViewMode.VIEW,
      timeRange: { from: dateRange.from, to: dateRange.to },
    });
    return Promise.resolve<DashboardCreationOptions>({ getInitialInput });
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!dashboard) return;
    dashboard.updateInput({
      filters:
        metrics.dataView && currentDashboard?.dashboardFilterAssetIdEnabled
          ? getFilterByAssetName(asset.name, asset.type, metrics.dataView)
          : [],
      timeRange: { from: dateRange.from, to: dateRange.to },
    });
  }, [
    metrics.dataView,
    asset.name,
    dashboard,
    dateRange.from,
    dateRange.to,
    currentDashboard,
    asset.type,
  ]);

  return (
    <EuiPanel hasBorder>
      {loading || status === FETCH_STATUS.LOADING ? (
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
          title={
            <h4>
              {i18n.translate('xpack.infra.customDashboards.loadingCustomDashboards', {
                defaultMessage: 'Loading dashboard',
              })}
            </h4>
          }
        />
      ) : !!dashboards?.length ? (
        <>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="xs" alignItems="center">
            <EuiFlexItem grow>
              <EuiTitle size="s">
                <h3>{currentDashboard?.title}</h3>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <DashboardSelector
                currentDashboardId={urlState?.dashboardId}
                customDashboards={customDashboards}
                setCurrentDashboard={setCurrentDashboard}
                onRefresh={reload}
              />
            </EuiFlexItem>

            {currentDashboard && (
              <EuiFlexItem grow={false}>
                <ContextMenu
                  items={[
                    <LinkDashboard
                      newDashboardButton
                      onRefresh={reload}
                      customDashboards={customDashboards}
                      assetType={asset.type}
                    />,
                    <GotoDashboardLink currentDashboard={currentDashboard} />,
                    <EditDashboard
                      currentDashboard={currentDashboard}
                      onRefresh={reload}
                      assetType={asset.type}
                    />,
                    <UnlinkDashboard
                      currentDashboard={currentDashboard}
                      onRefresh={reload}
                      assetType={asset.type}
                    />,
                  ]}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiFlexItem grow>
            <EuiSpacer size="l" />
            {urlState?.dashboardId && (
              <DashboardRenderer
                savedObjectId={urlState?.dashboardId}
                getCreationOptions={getCreationOptions}
                ref={setDashboard}
              />
            )}
          </EuiFlexItem>
        </>
      ) : (
        <EmptyDashboards
          actions={
            <LinkDashboard
              onRefresh={reload}
              customDashboards={customDashboards}
              assetType={asset.type}
            />
          }
        />
      )}
    </EuiPanel>
  );
}
