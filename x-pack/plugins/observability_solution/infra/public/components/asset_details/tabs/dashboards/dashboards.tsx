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
// import { SerializableRecord } from '@kbn/utility-types';

import { buildPhraseFilter, Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { HOST_FIELD } from '../../../../../common/constants';
import type {
  DashboardIdItem,
  DashboardItemWithTitle,
  InfraCustomDashboard,
  InfraCustomDashboardAssetType,
} from '../../../../../common/custom_dashboards';

import { EmptyDashboards } from './empty_dashboards';
import { EditDashboard, GotoDashboard, LinkDashboard } from './actions';
import { useCustomDashboard } from '../../hooks/use_custom_dashboards';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDashboardFetcher } from '../../hooks/use_dashboards_fetcher';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { DashboardSelector } from './dashboard_selector';
import { ContextMenu } from './context_menu';

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
  // const {
  //   path: { serviceName },
  //   query: { environment, kuery, dateRange.from, dateRange.to, dashboardId },
  // } = useAnyOfApmParams(
  //   '/services/{serviceName}/dashboards',
  //   '/mobile-services/{serviceName}/dashboards'
  // );
  const { dateRange } = useDatePickerContext();
  const { asset } = useAssetDetailsRenderPropsContext();
  const [dashboard, setDashboard] = useState<AwaitingDashboardAPI>();
  const [customDashboards, setCustomDashboards] = useState<DashboardItemWithTitle[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<DashboardItemWithTitle>();
  const { data: allAvailableDashboards } = useDashboardFetcher();
  // const { dataView } = useAdHocApmDataView();
  const { metrics } = useDataViewsContext();
  // const { share } = useApmPluginContext();

  const { dashboards, loading, error, reload } = useCustomDashboard({ assetType: asset.type });

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
  }, [allAvailableDashboards, dashboards]);

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
      // query: { query: kuery, language: 'kuery' },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.dataView, asset.name, dashboard, dateRange.from, dateRange.to]);

  // TODO LOCATOR

  // const getLocatorParams = useCallback(
  //   (params) => {
  //     return {
  //       serviceName,
  //       dashboardId: params.dashboardId,
  //       query: {
  //         // environment,
  //         // kuery,
  //         dateRange.from,
  //         dateRange.to,
  //       },
  //     };
  //   },
  //   [serviceName, environment, kuery, dateRange.from, dateRange.to]
  // );

  // const locator = useMemo(() => {
  //   const baseLocator = share.url.locators.get(APM_APP_LOCATOR_ID);
  //   if (!baseLocator) return;

  //   return {
  //     ...baseLocator,
  //     getRedirectUrl: (params: SerializableRecord) =>
  //       baseLocator.getRedirectUrl(getLocatorParams(params)),
  //     navigate: (params: SerializableRecord) => baseLocator.navigate(getLocatorParams(params)),
  //   };
  // }, [share, getLocatorParams]);

  return (
    <EuiPanel hasBorder={true}>
      {loading ? (
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
          title={
            <h4>
              {i18n.translate('xpack.infra.customDashboards.loadingCustomDashboards', {
                defaultMessage: 'Loading service dashboard',
              })}
            </h4>
          }
        />
      ) : (dashboards?.dashboardIdList ?? []).length > 0 ? (
        <>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={true}>
              <EuiTitle size="s">
                <h3>{currentDashboard?.title}</h3>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <DashboardSelector
                currentDashboardId={currentDashboard?.id}
                customDashboards={customDashboards}
                setCurrentDashboard={setCurrentDashboard}
              />
            </EuiFlexItem>

            {currentDashboard && (
              <EuiFlexItem grow={false}>
                <ContextMenu
                  items={[
                    <LinkDashboard
                      emptyButton={true}
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
                    // TODO
                    // <UnlinkDashboard
                    //   currentDashboard={currentDashboard}
                    //   defaultDashboard={customDashboards[0]}
                    //   onRefresh={reload}
                    // />,
                  ]}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiSpacer size="l" />
            {currentDashboard?.id && (
              <DashboardRenderer
                // locator={locator}
                savedObjectId={currentDashboard?.id}
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
