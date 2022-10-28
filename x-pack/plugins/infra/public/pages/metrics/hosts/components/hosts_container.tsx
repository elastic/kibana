/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
<<<<<<< HEAD
import { EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useMetricsDataViewContext } from '../hooks/use_data_view';
import { UnifiedSearchBar } from './unified_search_bar';
import { HostsTable } from './hosts_table';

export const HostContainer = () => {
  const { metricsDataView, isDataViewLoading, hasFailedLoadingDataView } =
    useMetricsDataViewContext();

  if (isDataViewLoading) {
    return (
      <InfraLoadingPanel
        height="100%"
        width="auto"
        text={i18n.translate('xpack.infra.waffle.loadingDataText', {
          defaultMessage: 'Loading data',
        })}
      />
    );
  }

  return hasFailedLoadingDataView || !metricsDataView ? null : (
    <>
      <UnifiedSearchBar dataView={metricsDataView} />
      <EuiSpacer />
      <HostsTable />
=======
import { useSourceContext } from '../../../../containers/metrics_source';
import { useSnapshot } from '../../inventory_view/hooks/use_snaphot';
import type { SnapshotMetricType } from '../../../../../common/inventory_models/types';
import { useMetricsDataViewContext } from '../hooks/use_data_view';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import type { InfraTimerangeInput } from '../../../../../common/http_api';
import { FilterBar } from './search_bar';
import { HostsTable } from './hosts_table';

export const HostContainer = () => {
  const { source, sourceId } = useSourceContext();
  const { metricsDataView, hasFailedCreatingDataView, hasFailedFetchingDataView } =
    useMetricsDataViewContext();
  const { esQuery, dateRangeTimestamp } = useUnifiedSearchContext();

  const hostMetrics: Array<{ type: SnapshotMetricType }> = [
    { type: 'rx' },
    { type: 'tx' },
    { type: 'memory' },
    { type: 'cpuCores' },
    { type: 'memoryTotal' },
  ];

  const timeRange: InfraTimerangeInput = {
    from: dateRangeTimestamp.from,
    to: dateRangeTimestamp.to,
    interval: '1m',
    ignoreLookback: true,
  };

  const hasError = hasFailedCreatingDataView || hasFailedFetchingDataView;

  const { loading, nodes, reload } = useSnapshot(
    esQuery && JSON.stringify(esQuery),
    hostMetrics,
    [],
    'host',
    sourceId,
    dateRangeTimestamp.to,
    '',
    '',
    true,
    timeRange
  );

  const isLoading = (loading || !metricsDataView) && !hasError;

  return (
    <>
      {hasError ? (
        <div>
          <div>There was an error trying to load or create the Data View:</div>
          {source?.configuration.metricAlias}
        </div>
      ) : (
        <>
          {metricsDataView && <FilterBar dataView={metricsDataView} />}
          <HostsTable loading={isLoading} nodes={nodes} reload={reload} />
        </>
      )}
>>>>>>> 8d4ad0f853f (Add unified search to hosts table)
    </>
  );
};
