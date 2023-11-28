/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { useMetadata } from '../../../components/asset_details/hooks/use_metadata';
import { useSourceContext } from '../../../containers/metrics_source';
import { InfraLoadingPanel } from '../../../components/loading';
import type { NavItem } from './lib/side_nav_context';
import { NodeDetailsPage } from './components/node_details_page';
import { useMetricsTimeContext } from './hooks/use_metrics_time';
import { MetricsPageTemplate } from '../page_template';

export const MetricDetailPage = () => {
  const {
    params: { type: nodeType, node: nodeId },
  } = useRouteMatch<{ type: InventoryItemType; node: string }>();
  const inventoryModel = findInventoryModel(nodeType);
  const { sourceId, metricIndicesExist } = useSourceContext();

  const {
    timeRange,
    parsedTimeRange,
    setTimeRange,
    refreshInterval,
    setRefreshInterval,
    isAutoReloading,
    setAutoReload,
    triggerRefresh,
  } = useMetricsTimeContext();
  const {
    name,
    filteredRequiredMetrics,
    loading: metadataLoading,
    cloudId,
    metadata,
  } = useMetadata({
    assetId: nodeId,
    assetType: nodeType,
    requiredMetrics: inventoryModel.requiredMetrics,
    sourceId,
    timeRange: parsedTimeRange,
  });

  const [sideNav, setSideNav] = useState<NavItem[]>([]);

  const addNavItem = React.useCallback(
    (item: NavItem) => {
      if (!sideNav.some((n) => n.id === item.id)) {
        setSideNav([item, ...sideNav]);
      }
    },
    [sideNav]
  );

  useMetricsBreadcrumbs([
    {
      text: name,
    },
  ]);

  if (metadataLoading && !filteredRequiredMetrics.length) {
    return (
      <MetricsPageTemplate hasData={metricIndicesExist}>
        <InfraLoadingPanel
          height="100vh"
          width="100%"
          text={i18n.translate('xpack.infra.metrics.loadingNodeDataText', {
            defaultMessage: 'Loading data',
          })}
        />
      </MetricsPageTemplate>
    );
  }

  return (
    <>
      {metadata ? (
        <NodeDetailsPage
          name={name}
          requiredMetrics={filteredRequiredMetrics}
          sourceId={sourceId}
          timeRange={timeRange}
          nodeType={nodeType}
          nodeId={nodeId}
          cloudId={cloudId}
          metadataLoading={metadataLoading}
          isAutoReloading={isAutoReloading}
          refreshInterval={refreshInterval}
          sideNav={sideNav}
          metadata={metadata}
          addNavItem={addNavItem}
          setRefreshInterval={setRefreshInterval}
          setAutoReload={setAutoReload}
          triggerRefresh={triggerRefresh}
          setTimeRange={setTimeRange}
        />
      ) : null}
    </>
  );
};
