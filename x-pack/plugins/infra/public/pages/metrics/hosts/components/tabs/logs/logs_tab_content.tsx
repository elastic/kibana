/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Filter } from '@kbn/es-query';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
  const { from, to } = useMemo(() => getDateRangeAsTimestamp(), [getDateRangeAsTimestamp]);
  const { hostNodes } = useHostsViewContext();

  const hostsFilterQuery = useMemo(() => createHostsFilter(hostNodes), [hostNodes]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-logs">
      <EuiFlexGroup gutterSize={'m'} alignItems={'center'} responsive={false}>
        <EuiFlexItem>
          <LogsSearchBar />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogsLinkToStream startTimestamp={from} endTimestamp={to} query={filterQuery.query} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem>
        {hostNodes.length ? (
          <LogStream
            height={500}
            logView={{ type: 'log-view-reference', logViewId: 'default' }}
            startTimestamp={from}
            endTimestamp={to}
            filters={hostsFilterQuery}
            query={filterQuery}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const createHostsFilter = (hostNodes: SnapshotNode[]): Filter[] => {
  const hostsFilter = {
    query: {
      terms: {
        'host.name': hostNodes.map((p) => p.name),
      },
    },
    meta: {},
  };

  return [hostsFilter].filter(Boolean) as Filter[];
};
