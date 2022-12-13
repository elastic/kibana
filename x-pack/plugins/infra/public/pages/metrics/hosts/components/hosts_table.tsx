/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { HostsTableColumns } from './hosts_table_columns';
import { NoData } from '../../../../components/empty_states';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useHostTable } from '../hooks/use_host_table';
import { useSnapshot } from '../../inventory_view/hooks/use_snaphot';
import type { SnapshotMetricType } from '../../../../../common/inventory_models/types';
import type { InfraTimerangeInput } from '../../../../../common/http_api';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { useSourceContext } from '../../../../containers/metrics_source';
import { useTableProperties } from '../hooks/use_table_properties_url_state';

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
  const { buildQuery, dateRangeTimestamp, panelFilters } = useUnifiedSearchContext();
  const [properties, setProperties] = useTableProperties();

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
  const { loading, nodes, reload } = useSnapshot({
    filterQuery: esQuery ? JSON.stringify(esQuery) : null,
    metrics: HOST_METRICS,
    groupBy: [],
    nodeType: 'host',
    sourceId,
    currentTime: dateRangeTimestamp.to,
    accountId: '',
    region: '',
    timerange: timeRange,
    includeTimeseries: false,
  });

  const items = useHostTable(nodes);
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

  return (
    <>
      {loading || !panelFilters ? (
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
        <EuiInMemoryTable
          pagination={properties.pagination}
          sorting={
            typeof properties.sorting === 'boolean'
              ? properties.sorting
              : { sort: properties.sorting }
          }
          items={items}
          columns={HostsTableColumns}
          onTableChange={onTableChange}
        />
      )}
    </>
  );
};
