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

const HOST_METRICS: Array<{ type: SnapshotMetricType }> = [
  { type: 'rx' },
  { type: 'tx' },
  { type: 'memory' },
  { type: 'cpuCores' },
  { type: 'diskLatency' },
  { type: 'memoryTotal' },
];

export const HostsTable = () => {
  const { sourceId } = useSourceContext();
  const { buildQuery, dateRangeTimestamp } = useUnifiedSearchContext();

  const timeRange: InfraTimerangeInput = {
    from: dateRangeTimestamp.from,
    to: dateRangeTimestamp.to,
    interval: '1m',
    ignoreLookback: true,
  };

  const esQuery = buildQuery();

  // Snapshot endpoint internally uses the indices stored in source.configuration.metricAlias.
  // For the Unified Search, we create a data view, which for now will be built off of source.configuration.metricAlias too
  // if we introduce data view selection, we'll have to change this hook and the endpoint to accept a new parameter for the indices
  const { loading, nodes, reload } = useSnapshot(
    esQuery && JSON.stringify(esQuery),
    HOST_METRICS,
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
        <div>
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
        </div>
      ) : (
        <EuiInMemoryTable pagination sorting items={items} columns={HostsTableColumns} />
      )}
    </>
  );
};
