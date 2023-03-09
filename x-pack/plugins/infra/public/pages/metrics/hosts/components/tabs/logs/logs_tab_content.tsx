/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { Filter } from '@kbn/es-query';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SnapshotNode } from '../../../../../../../common/http_api';
import { LogStream } from '../../../../../../components/log_stream';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useLogsSearchUrlState } from '../../../hooks/use_logs_search_url_state';

export const LogsTabContent = () => {
  const [filterQuery, setFilterQuery] = useLogsSearchUrlState();
  const [searchText, setSearchText] = useState(filterQuery.query);

  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();
  const { from, to } = useMemo(() => getDateRangeAsTimestamp(), [getDateRangeAsTimestamp]);
  const { hostNodes } = useHostsViewContext();

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const hostsFilterQuery = useMemo(() => createHostsFilter(hostNodes), [hostNodes]);
  const searchQuery = useMemo(() => {
    return {
      language: 'kuery',
      query: filterQuery.query,
    };
  }, [filterQuery]);

  useDebounce(() => setFilterQuery({ ...filterQuery, query: searchText }), debounceIntervalInMs, [
    searchText,
  ]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-logs">
      <EuiFlexGroup gutterSize={'m'} alignItems={'center'} responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            isClearable
            placeholder={i18n.translate(
              'xpack.infra.hostsViewPage.tabs.logs.textFieldPlaceholder',
              {
                defaultMessage: 'Search for log entries...',
              }
            )}
            onChange={onQueryChange}
            value={searchText}
          />
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
            query={searchQuery}
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

const debounceIntervalInMs = 1000;
