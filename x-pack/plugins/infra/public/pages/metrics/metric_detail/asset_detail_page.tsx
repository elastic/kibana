/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useLocation, useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { NoRemoteCluster } from '../../../components/empty_states';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useSourceContext } from '../../../containers/metrics_source';
import { FlyoutTabIds, type Tab } from '../../../components/asset_details/types';
import type { InventoryItemType } from '../../../../common/inventory_models/types';
import { AssetDetails } from '../../../components/asset_details/asset_details';
import { MetricsPageTemplate } from '../page_template';
import { useMetricsTimeContext } from './hooks/use_metrics_time';

const orderedFlyoutTabs: Tab[] = [
  {
    id: FlyoutTabIds.OVERVIEW,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.overview.title', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: FlyoutTabIds.METADATA,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.metadata.title', {
      defaultMessage: 'Metadata',
    }),
  },
  {
    id: FlyoutTabIds.PROCESSES,
    name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.processes', {
      defaultMessage: 'Processes',
    }),
  },
  {
    id: FlyoutTabIds.LOGS,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.logs.title', {
      defaultMessage: 'Logs',
    }),
  },
  {
    id: FlyoutTabIds.ANOMALIES,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.anomalies', {
      defaultMessage: 'Anomalies',
    }),
  },
  {
    id: FlyoutTabIds.OSQUERY,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.osquery', {
      defaultMessage: 'Osquery',
    }),
  },
];

export const AssetDetailPage = () => {
  const { isLoading, loadSourceFailureMessage, loadSource, source } = useSourceContext();
  const {
    params: { type: nodeType, node: nodeId },
  } = useRouteMatch<{ type: InventoryItemType; node: string }>();
  const { search } = useLocation();

  const assetName = useMemo(() => {
    const queryParams = new URLSearchParams(search);
    return queryParams.get('assetName') ?? undefined;
  }, [search]);

  const { timeRange } = useMetricsTimeContext();

  const dateRange: TimeRange = useMemo(
    () => ({
      from:
        typeof timeRange.from === 'number'
          ? new Date(timeRange.from).toISOString()
          : timeRange.from,
      to: typeof timeRange.to === 'number' ? new Date(timeRange.to).toISOString() : timeRange.to,
    }),
    [timeRange.from, timeRange.to]
  );

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
    <MetricsPageTemplate
      hasData={metricIndicesExist}
      pageSectionProps={{
        paddingSize: 'none',
      }}
    >
      <AssetDetails
        asset={{
          id: nodeId,
          name: assetName,
        }}
        assetType={nodeType}
        dateRange={dateRange}
        tabs={orderedFlyoutTabs}
        links={['apmServices']}
        renderMode={{
          mode: 'page',
        }}
        metricAlias={source.configuration.metricAlias}
      />
    </MetricsPageTemplate>
  );
};
