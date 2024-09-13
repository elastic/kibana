/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { enableInfrastructureContainerAssetView } from '@kbn/observability-plugin/common';
import { AssetDetailPage } from './asset_detail_page';
import { MetricDetailPage } from './metric_detail_page';
import { MetricsTimeProvider } from './hooks/use_metrics_time';

export const NodeDetail = () => {
  const {
    params: { type: nodeType },
  } = useRouteMatch<{ type: InventoryItemType; node: string }>();

  const isContainerAssetViewEnabled = useUiSetting(enableInfrastructureContainerAssetView);

  const showContainerAssetDetailPage = nodeType === 'container' && isContainerAssetViewEnabled;
  return (
    <EuiErrorBoundary>
      {nodeType === 'host' || showContainerAssetDetailPage ? (
        <AssetDetailPage />
      ) : (
        <MetricsTimeProvider>
          <MetricDetailPage />
        </MetricsTimeProvider>
      )}
    </EuiErrorBoundary>
  );
};
