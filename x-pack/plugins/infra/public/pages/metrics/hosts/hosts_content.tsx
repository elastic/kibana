/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { NoData } from '../../../components/empty_states';
import { InfraLoadingPanel } from '../../../components/loading';
import { useMetricsDataViewContext } from './hooks/use_data_view';
import { HostsTable } from './components/hosts_table';
import { useSourceContext } from '../../../containers/metrics_source';
import { useSnapshot } from '../inventory_view/hooks/use_snaphot';
import type { SnapshotMetricType } from '../../../../common/inventory_models/types';

export const HostsContent: React.FunctionComponent = () => {
  const { source, sourceId } = useSourceContext();
  const [dateRange, setDateRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });
  const [query, setQuery] = useState<Query>({ query: '', language: 'kuery' });
  const { metricsDataView, hasFailedCreatingDataView, hasFailedFetchingDataView } =
    useMetricsDataViewContext();
  // needed to refresh the lens table when filters havent changed

  const onQuerySubmit = useCallback(
    (payload: { dateRange: TimeRange; query?: Query }) => {
      setDateRange(payload.dateRange);
      if (payload.query) {
        setQuery(payload.query);
      }
    },
    [setDateRange, setQuery]
  );

  const hostMetrics: Array<{ type: SnapshotMetricType }> = [
    { type: 'rx' },
    { type: 'tx' },
    { type: 'memory' },
    { type: 'cpuCores' },
    { type: 'memoryTotal' },
  ];

  const { loading, nodes, reload } = useSnapshot(
    '', // use the unified search query, supported type?
    hostMetrics,
    [],
    'host',
    sourceId,
    1666081614879, // currentTime.  need to add support for TimeRange?
    '',
    '',
    true,
    {
      from: 1666081614879, // dynamic time range needs to be supported
      interval: '1m',
      lookbackSize: 5,
      to: 1666082814879,
    }
  );

  const noData = !loading && nodes && nodes.length === 0;

  return (
    <div>
      {metricsDataView && !loading ? (
        noData ? (
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
          <>
            <SearchBar
              showFilterBar={false}
              showDatePicker={true}
              showAutoRefreshOnly={false}
              showSaveQuery={true}
              showQueryInput={true}
              query={query}
              dateRangeFrom={dateRange.from}
              dateRangeTo={dateRange.to}
              indexPatterns={[metricsDataView]}
              onQuerySubmit={onQuerySubmit}
            />
            <EuiSpacer />
            <HostsTable nodes={nodes} />
          </>
        )
      ) : hasFailedCreatingDataView || hasFailedFetchingDataView ? (
        <div>
          <div>There was an error trying to load or create the Data View:</div>
          {source?.configuration.metricAlias}
        </div>
      ) : (
        <InfraLoadingPanel
          height="100vh"
          width="auto"
          text={i18n.translate('xpack.infra.waffle.loadingDataText', {
            defaultMessage: 'Loading data',
          })}
        />
      )}
    </div>
  );
};
