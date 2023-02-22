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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import useList from 'react-use/lib/useList';
import { SnapshotNode, SnapshotNodeResponse } from '../../../../../common/http_api';
import { InfraClientStartDeps } from '../../../../types';
import { NoData } from '../../../../components/empty_states';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useHostsTable } from '../hooks/use_hosts_table';
import { convertToSnapshotApiRequest } from '../../inventory_view/hooks/use_snaphot';
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
  const {
    services: { bfetch, data },
  } = useKibana<InfraClientStartDeps>();
  const { baseRequest, setHostViewState, hostViewState } = useHostsViewContext();
  const { onSubmit, unifiedSearchDateRange } = useUnifiedSearchContext();
  const [properties, setProperties] = useTableProperties();
  const [nodes, { set: setResult, clear: clearList }] = useList<SnapshotNode>([]);

  useEffect(() => {
    clearList();
    const payload = convertToSnapshotApiRequest({ ...baseRequest, metrics: HOST_TABLE_METRICS });
    const { stream } = bfetch.fetchStreaming({
      url: '/api/metrics/hosts',
      body: JSON.stringify({
        request: payload,
        options: {
          executionContext: {
            name: 'Hosts Table',
            type: 'infrastructure_observability_table_view',
            url: '/ftw/app/metrics/hosts',
          },
          isSearchStored: false,
          strategy: ENHANCED_ES_SEARCH_STRATEGY,
          sessionId: data.search.session.getSessionId(),
        },
      }),
    });

    const subscription = stream.subscribe({
      next(test) {
        const response = JSON.parse(test) as SnapshotNodeResponse;
        if (response.nodes.length > 0) {
          setResult(response.nodes);
        }
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [baseRequest, bfetch, clearList, data.search.session, setResult]);

  const { columns, items } = useHostsTable(nodes, { time: unifiedSearchDateRange });

  useEffect(() => {
    if (nodes.length !== hostViewState.totalHits) {
      setHostViewState({
        loading: false,
        totalHits: nodes.length,
        error: '',
      });
    }
  }, [hostViewState.totalHits, nodes.length, setHostViewState]);

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

  if (nodes.length === 0) {
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
