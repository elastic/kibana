/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { NoRemoteCluster } from '../../../components/empty_states';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useSourceContext } from '../../../containers/metrics_source';
import { AssetDetails } from '../../../components/asset_details';
import { MetricsPageTemplate } from '../page_template';
import { commonFlyoutTabs } from '../../../common/asset_details_config/asset_details_tabs';

export const AssetDetailPage = () => {
  const { isLoading, loadSourceFailureMessage, loadSource, source } = useSourceContext();
  const {
    params: { type: nodeType, node: nodeId },
  } = useRouteMatch<{ type: InventoryItemType; node: string }>();

  const { metricIndicesExist, remoteClustersExist } = source?.status ?? {};

  if (isLoading || !source) return <SourceLoadingPage />;

  if (!remoteClustersExist) {
    return <NoRemoteCluster />;
  }

  if (!metricIndicesExist) {
    return (
      <MetricsPageTemplate hasData={metricIndicesExist} data-test-subj="noMetricsIndicesPrompt" />
    );
  }

  if (loadSourceFailureMessage)
    return <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />;

  return (
    <AssetDetails
      assetId={nodeId}
      assetType={nodeType}
      tabs={commonFlyoutTabs}
      renderMode={{
        mode: 'page',
      }}
      metricAlias={source.configuration.metricAlias}
    />
  );
};
