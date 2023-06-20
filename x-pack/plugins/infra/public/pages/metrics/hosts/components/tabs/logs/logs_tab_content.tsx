/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DEFAULT_LOG_VIEW } from '../../../../../../../common/log_views';
import type {
  LogIndexReference,
  LogViewReference,
} from '../../../../../../../common/log_views/types';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
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

  const [logViewIndices, setLogViewIndices] = useState<LogIndexReference>();

  const {
    services: {
      logViews: { client },
    },
  } = useKibanaContextForPlugin();

  useEffect(() => {
    const getLogView = async () => {
      const { attributes } = await client.getLogView(DEFAULT_LOG_VIEW);
      setLogViewIndices(attributes.logIndices);
    };
    getLogView();
  }, [client, setLogViewIndices]);

  const hostsFilterQuery = useMemo(
    () => createHostsFilter(hostNodes.map((p) => p.name)),
    [hostNodes]
  );

  const logView: LogViewReference = useMemo(() => {
    return {
      type: 'log-view-inline',
      id: 'hosts-logs-view',
      attributes: {
        name: 'Hosts Logs View',
        description: 'Default view for hosts logs tab',
        logIndices: logViewIndices!,
        logColumns: [
          {
            timestampColumn: {
              id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f',
            },
          },
          {
            fieldColumn: {
              id: 'eb9777a8-fcd3-420e-ba7d-172fff6da7a2',
              field: 'host.name',
            },
          },
          {
            messageColumn: {
              id: 'b645d6da-824b-4723-9a2a-e8cece1645c0',
            },
          },
        ],
      },
    };
  }, [logViewIndices]);

  const logsLinkToStreamQuery = useMemo(() => {
    const hostsFilterQueryParam = createHostsFilterQueryParam(hostNodes.map((p) => p.name));

    if (filterQuery.query && hostsFilterQueryParam) {
      return `${filterQuery.query} and ${hostsFilterQueryParam}`;
    }

    return filterQuery.query || hostsFilterQueryParam;
  }, [filterQuery.query, hostNodes]);

  if (loading || !logViewIndices) {
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
          <LogsLinkToStream
            startTime={from}
            endTime={to}
            query={logsLinkToStreamQuery}
            logView={logView}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexItem>
        <LogStream
          height={500}
          logView={logView}
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
