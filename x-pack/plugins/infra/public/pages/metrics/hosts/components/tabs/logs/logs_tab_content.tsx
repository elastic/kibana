/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { InfraLoadingPanel } from '../../../../../../components/loading';
import { LogStream } from '../../../../../../components/log_stream';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useLogsSearchUrlState } from '../../../hooks/use_logs_search_url_state';
import { LogsLinkToStream } from './logs_link_to_stream';
import { LogsSearchBar } from './logs_search_bar';
import { createHostsFilter } from '../../../utils';

export const LogsTabContent = () => {
  const [filterQuery] = useLogsSearchUrlState();
  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();
  const { from, to } = useMemo(() => getDateRangeAsTimestamp(), [getDateRangeAsTimestamp]);
  const { hostNodes, loading } = useHostsViewContext();

  const hostsFilterQuery = useMemo(
    () => createHostsFilter(hostNodes.map((p) => p.name)),
    [hostNodes]
  );

  const logsLinkToStreamQuery = useMemo(() => {
    const hostsFilterQueryParam = createHostsFilterQueryParam(hostNodes.map((p) => p.name));

    if (filterQuery.query && hostsFilterQueryParam) {
      return `${filterQuery.query} and ${hostsFilterQueryParam}`;
    }

    return filterQuery.query || hostsFilterQueryParam;
  }, [filterQuery.query, hostNodes]);

  if (loading) {
    return (
      <EuiFlexGroup style={{ height: 300 }} direction="column" alignItems="stretch">
        <EuiFlexItem grow>
          <InfraLoadingPanel
            width="100%"
            height="100%"
            text={
              <FormattedMessage
                id="xpack.infra.hostsViewPage.tabs.logs.loadingEntriesLabel"
                defaultMessage="Loading entries"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

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

const createHostsFilterQueryParam = (hostNodes: string[]): string => {
  if (!hostNodes.length) {
    return '';
  }

  const joinedHosts = hostNodes.join(' or ');
  const hostsQueryParam = `host.name:(${joinedHosts})`;

  return hostsQueryParam;
};
