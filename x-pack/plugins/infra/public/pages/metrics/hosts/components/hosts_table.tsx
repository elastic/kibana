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
import { SnapshotMetricType } from '../../../../../common/inventory_models/types';
import { SnapshotNodeMetric } from '../../../../../common/http_api';
import { HostMetics, HostsTableColumns } from './hosts_table_columns';
import { NoData } from '../../../../components/empty_states';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useHostsViewContext } from '../hooks/use_host_table';
import { useTableProperties } from '../hooks/use_table_properties_url_state';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { useSnapshot } from '../../inventory_view/hooks/use_snaphot';

type MappedMetrics = Record<keyof HostMetics, SnapshotNodeMetric>;

const HOST_TABLE_METRICS: Array<{ type: SnapshotMetricType }> = [
  { type: 'rx' },
  { type: 'tx' },
  { type: 'memory' },
  { type: 'cpuCores' },
  { type: 'diskLatency' },
  { type: 'memoryTotal' },
];

export const HostsTable = () => {
  const { panelFilters } = useUnifiedSearchContext();
  const { baseRequest, refetch$, state$ } = useHostsViewContext();
  const [properties, setProperties] = useTableProperties();

  // Snapshot endpoint internally uses the indices stored in source.configuration.metricAlias.
  // For the Unified Search, we create a data view, which for now will be built off of source.configuration.metricAlias too
  // if we introduce data view selection, we'll have to change this hook and the endpoint to accept a new parameter for the indices
  const { loading, nodes, error, reload } = useSnapshot({
    ...baseRequest,
    metrics: HOST_TABLE_METRICS,
  });

  const onReload = () => {
    refetch$.next('reload');
  };

  useEffect(() => {
    if (!loading) {
      state$.next({
        loading,
        totalHits: nodes.length,
        error,
      });
    }
  }, [error, loading, nodes.length, state$]);

  useEffect(() => {
    const refetch = refetch$.subscribe(() => {
      reload();
      state$.next({ loading: true, totalHits: 0, error: null });
    });
    return () => {
      refetch.unsubscribe();
    };
  }, [reload, refetch$, state$]);

  const getTableRows = useCallback(() => {
    return nodes.map(({ metrics, path, name }) => ({
      name,
      os: path.at(-1)?.os ?? '-',
      title: {
        name,
        cloudProvider: path.at(-1)?.cloudProvider ?? null,
      },
      ...metrics.reduce((data, metric) => {
        data[metric.name as keyof HostMetics] = metric;
        return data;
      }, {} as MappedMetrics),
    }));
  }, [nodes]);

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

  const items = getTableRows();
  const noData = !!error || items.length === 0;

  if (loading || !panelFilters) {
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
        onRefetch={onReload}
        testString="noMetricsDataPrompt"
      />
    );
  }

  return (
    <EuiInMemoryTable
      pagination={properties.pagination}
      sorting={
        typeof properties.sorting === 'boolean' ? properties.sorting : { sort: properties.sorting }
      }
      items={items}
      columns={HostsTableColumns}
      onTableChange={onTableChange}
    />
  );
};
