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

import { buildPhraseFilter, Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { HOST_FIELD } from '../../../../../common/constants';
import type {
  DashboardIdItem,
  DashboardItemWithTitle,
  InfraCustomDashboardAssetType,
} from '../../../../../common/custom_dashboards';

import { EmptyDashboards } from './empty_dashboards';
import { EditDashboard, GotoDashboard, LinkDashboard, UnlinkDashboard } from './actions';
import { useCustomDashboard } from '../../hooks/use_custom_dashboards';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { FETCH_STATUS, useDashboardFetcher } from '../../hooks/use_dashboards_fetcher';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { DashboardSelector } from './dashboard_selector';
import { ContextMenu } from './context_menu';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';

const fieldByAssetType = {
  host: HOST_FIELD,
} as Record<InfraCustomDashboardAssetType, string>;

export function getFilterByAssetName(
  assetName: string,
  assetType: InfraCustomDashboardAssetType,
  dataView: DataView
): Filter[] {
  const filters: Filter[] = [];

  const assetNameField = dataView.getFieldByName(fieldByAssetType[assetType]);
  if (assetNameField) {
    const assetNameFilter = buildPhraseFilter(assetNameField, assetName, dataView);
    filters.push(assetNameFilter);
  }

  return filters;
}

export function Dashboards() {
  const { dateRange } = useDatePickerContext();
  const { asset } = useAssetDetailsRenderPropsContext();
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();
  const [customDashboards, setCustomDashboards] = useState<DashboardItemWithTitle[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<DashboardItemWithTitle>();
  const { data: allAvailableDashboards, status } = useDashboardFetcher();
  const { metrics } = useDataViewsContext();
  const [urlState, setUrlState] = useAssetDetailsUrlState();

  const { dashboards, loading, reload } = useCustomDashboard({ assetType: asset.type });

  useEffect(() => {
    const filteredCustomDashboards = (dashboards?.dashboardIdList ?? []).reduce(
      (result: DashboardItemWithTitle[], customDashboard: DashboardIdItem) => {
        const matchedDashboard = allAvailableDashboards.find(({ id }) => id === customDashboard.id);
        if (matchedDashboard) {
          result.push({
            title: matchedDashboard.attributes.title,
            ...customDashboard,
          });
        }
        return result;
      },
      []
    );
    setCustomDashboards(filteredCustomDashboards);
    // set a default dashboard if there is no selected dashboard
    if (!urlState?.dashboardId) {
      setUrlState({ dashboardId: currentDashboard?.id ?? filteredCustomDashboards[0]?.id });
    }
  }, [
    allAvailableDashboards,
    currentDashboard?.id,
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
        metrics.dataView && currentDashboard?.hostNameFilterEnabled
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
    currentDashboard?.hostNameFilterEnabled,
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
      ) : (dashboards?.dashboardIdList ?? []).length > 0 ? (
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
              />
            </EuiFlexItem>

            {currentDashboard && (
              <EuiFlexItem grow={false}>
                <ContextMenu
                  items={[
                    <LinkDashboard
                      emptyButton
                      onRefresh={reload}
                      customDashboards={customDashboards}
                      assetType={asset.type}
                    />,
                    <GotoDashboard currentDashboard={currentDashboard} />,
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
