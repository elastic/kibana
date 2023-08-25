/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import type { InventoryItemType } from '../../../../common/inventory_models/types';
import { AssetDetailPage } from './asset_detail_page';
import { MetricsTimeProvider } from './hooks/use_metrics_time';
import { MetricDetailPage } from './metric_detail_page';

export const MetricDetail = () => {
  const {
    params: { type: nodeType, node: nodeName },
  } = useRouteMatch<{ type: InventoryItemType; node: string }>();

  const PageContent = () => (nodeType === 'host' ? <AssetDetailPage /> : <MetricDetailPage />);

  useMetricsBreadcrumbs([
    {
      text: nodeName,
    },
  ]);

  return (
    <EuiErrorBoundary>
      <MetricsTimeProvider>
        <PageContent />
      </MetricsTimeProvider>
    </EuiErrorBoundary>
  );
};
