/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { NoData } from '../../../../components/empty_states';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useHostsTable } from '../hooks/use_hosts_table';
import { useSnapshot } from '../../inventory_view/hooks/use_snaphot';
import type { SnapshotMetricType } from '../../../../../common/inventory_models/types';
import { useTableProperties } from '../hooks/use_table_properties_url_state';
import { useHostsViewContext } from '../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';

const HOST_TABLE_METRICS: Array<{ type: SnapshotMetricType }> = [
  { type: 'rx' },
  { type: 'tx' },
  { type: 'memory' },
  { type: 'cpuCores' },
  { type: 'diskLatency' },
  { type: 'memoryTotal' },
];

export const HostsTable = () => {
  const { baseRequest, setHostViewState, hostViewState } = useHostsViewContext();
  const { onSubmit, unifiedSearchDateRange } = useUnifiedSearchContext();
  const [properties, setProperties] = useTableProperties();

  // Snapshot endpoint internally uses the indices stored in source.configuration.metricAlias.
  // For the Unified Search, we create a data view, which for now will be built off of source.configuration.metricAlias too
  // if we introduce data view selection, we'll have to change this hook and the endpoint to accept a new parameter for the indices
  const { loading, nodes, error } = useSnapshot({
    ...baseRequest,
    metrics: HOST_TABLE_METRICS,
  });

  const { columns, items } = useHostsTable(nodes, { time: unifiedSearchDateRange });

  useEffect(() => {
    if (hostViewState.loading !== loading || nodes.length !== hostViewState.totalHits) {
      setHostViewState({
        loading,
        totalHits: nodes.length,
        error,
      });
    }
  }, [
    error,
    hostViewState.loading,
    hostViewState.totalHits,
    loading,
    nodes.length,
    setHostViewState,
  ]);

  const noData = items.length === 0;

  const onTableChange = useCallback(
    ({ page = {}, sort = {} }) => {
      const { index: pageIndex, size: pageSize } = page;
      const { field, direction } = sort;

      const sorting = field && direction ? { field, direction } : true;
      const pagination = pageIndex >= 0 && pageSize !== 0 ? { pageIndex, pageSize } : true;

      if (!isEqual(properties.sorting, sorting)) {
        setProperties({ sorting });
      }
      if (!isEqual(properties.pagination, pagination)) {
        setProperties({ pagination });
      }
    },
    [setProperties, properties.pagination, properties.sorting]
  );

  if (loading) {
    return (
      <InfraLoadingPanel
        height="185px"
        width="auto"
        text={i18n.translate('xpack.infra.waffle.loadingDataText', {
          defaultMessage: 'Loading data',
        })}
      />
    );
  }

  if (noData) {
    return (
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
        onRefetch={() => onSubmit()}
        testString="noMetricsDataPrompt"
      />
    );
  }

  return (
    <EuiInMemoryTable
      data-test-subj="hostsView-table"
      pagination={properties.pagination}
      sorting={
        typeof properties.sorting === 'boolean' ? properties.sorting : { sort: properties.sorting }
      }
      rowProps={{
        'data-test-subj': 'hostsView-tableRow',
      }}
      items={items}
      columns={columns}
      onTableChange={onTableChange}
    />
  );
};
