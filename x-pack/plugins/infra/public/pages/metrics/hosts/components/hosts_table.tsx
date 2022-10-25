/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HostsTableColumns } from './hosts_table_columns';
import { NoData } from '../../../../components/empty_states';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useHostTable } from '../hooks/use_host_table';
import { useSnapshot } from '../../inventory_view/hooks/use_snaphot';
import type { SnapshotMetricType } from '../../../../../common/inventory_models/types';
import type { InfraTimerangeInput } from '../../../../../common/http_api';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { useSourceContext } from '../../../../containers/metrics_source';

export const HostsTable = () => {
  const { sourceId } = useSourceContext();
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

  // Snapshot endpoint uses internally the indices stored in source.configuration.metricAlias.
  // For the Unified Search, we create a data view, which for now will be built off source.configuration.metricAlias too
  // if we introduce data view selection, we'll have to change this hook and the endpoint
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

  const items = useHostTable(nodes);
  const noData = items.length === 0;

  return (
    <>
      {loading ? (
        <InfraLoadingPanel
          height="100%"
          width="auto"
          text={i18n.translate('xpack.infra.waffle.loadingDataText', {
            defaultMessage: 'Loading data',
          })}
        />
      ) : noData ? (
        <NoData
          titleText={i18n.translate('xpack.infra.waffle.noDataTitle', {
            defaultMessage: 'There is no data to display.',
          })}
          bodyText={i18n.translate('xpack.infra.waffle.noDataDescription', {
            defaultMessage: 'Try adjusting your time or filter.',
          })}
          refetchText={i18n.translate('xpack.infra.waffle.checkNewDataButtonLabel', {
            defaultMessage: 'Check for new data',
          })}
          onRefetch={() => {
            reload();
          }}
          testString="noMetricsDataPrompt"
        />
      ) : (
        <EuiInMemoryTable pagination sorting items={items} columns={HostsTableColumns} />
      )}
    </>
  );
};
