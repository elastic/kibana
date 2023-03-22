/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { SnapshotNode } from '../../../../../../../common/http_api';
import { LogStream } from '../../../../../../components/log_stream';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useLogsSearchUrlState } from '../../../hooks/use_logs_search_url_state';
import { LogsLinkToStream } from './logs_link_to_stream';
import { LogsSearchBar } from './logs_search_bar';

export const LogsTabContent = () => {
  const [filterQuery] = useLogsSearchUrlState();
  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();
  const { from, to } = getDateRangeAsTimestamp();
  const { hostNodes, loading } = useHostsViewContext();

  const hostsFilterQuery = useMemo(() => createHostsFilter(hostNodes), [hostNodes]);

  const logsLinkToStreamQuery = useMemo(() => {
    const hostsFilterQueryParam = createHostsFilterQueryParam(hostNodes);
    return `${filterQuery.query ? filterQuery.query + ' and ' : ''}${hostsFilterQueryParam}`;
  }, [filterQuery.query, hostNodes]);

  if (loading)
    return (
      <EuiFlexGroup style={{ height: 300 }} alignItems="center" justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-logs">
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <LogsSearchBar />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogsLinkToStream startTimestamp={from} endTimestamp={to} query={logsLinkToStreamQuery} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexItem>
        <LogStream
          height={500}
          logView={{ type: 'log-view-reference', logViewId: 'default' }}
          startTimestamp={from}
          endTimestamp={to}
          filters={[hostsFilterQuery]}
          query={filterQuery}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const createHostsFilter = (hostNodes: SnapshotNode[]): Filter => {
  return {
    query: {
      terms: {
        'host.name': hostNodes.map((p) => p.name),
      },
    },
    meta: {},
  };
};

const createHostsFilterQueryParam = (hostNodes: SnapshotNode[]): string => {
  return hostNodes.map((p) => `host.name:${p.name}`).join(' or ');
};
