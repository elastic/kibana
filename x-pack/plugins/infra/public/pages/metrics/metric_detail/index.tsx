/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { useRouteMatch } from 'react-router-dom';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { AssetDetailPage } from './asset_detail_page';
import { MetricDetailPage } from './metric_detail_page';
import { MetricsTimeProvider } from './hooks/use_metrics_time';
import { useParentBreadcrumbResolver } from './hooks/use_parent_breadcrumb_resolver';

export const NodeDetail = () => {
  const {
    params: { type: nodeType, node: nodeId },
  } = useRouteMatch<{ type: InventoryItemType; node: string }>();
  const {
    services: { serverless },
  } = useKibanaContextForPlugin();
  const parentBreadcrumbResolver = useParentBreadcrumbResolver();
  const breadcrumbOptions = parentBreadcrumbResolver.getBreadcrumbOptions(nodeType);
  const breadCrumb = useMemo(
    () => [
      {
        ...breadcrumbOptions.link,
        text: breadcrumbOptions.text,
      },
      {
        text: nodeId,
      },
    ],
    [breadcrumbOptions, nodeId]
  );

  useMetricsBreadcrumbs(breadCrumb);
  useEffect(() => {
    if (serverless) {
      // For deeper context breadcrumbs serveless provides its own breadcrumb service. https://docs.elastic.dev/kibana-dev-docs/serverless-project-navigation#breadcrumbs
      serverless.setBreadcrumbs(breadCrumb);
    }
  }, [serverless, breadCrumb]);

  return (
    <EuiErrorBoundary>
      {nodeType === 'host' ? (
        <AssetDetailPage />
      ) : (
        <MetricsTimeProvider>
          <MetricDetailPage />
        </MetricsTimeProvider>
      )}
    </EuiErrorBoundary>
  );
};
