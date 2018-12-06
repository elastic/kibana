/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import { HostItem } from '../../../../../common/graphql/types';
import { LoadMoreTable } from '../../../load_more_table';

interface HostsTableProps {
  data: HostItem[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string | null;
  totalCount: number;
  loadMore: (cursor: string, limit: number) => void;
}

export const HostsTable = pure<HostsTableProps>(
  ({ data, hasNextPage, loading, loadMore, totalCount, nextCursor }) => (
    <LoadMoreTable
      columns={getHostsColumns()}
      loadingTitle="Hosts"
      loading={loading}
      pageOfItems={data}
      loadMore={() => loadMore(nextCursor!, 2)}
      hasNextPage={hasNextPage!}
      title={
        <h3>
          Hosts <EuiBadge color="hollow">{totalCount}</EuiBadge>
        </h3>
      }
    />
  )
);

const getHostsColumns = () => [
  {
    name: 'Host',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.name', item)}</>,
  },
  {
    name: 'First seen',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.firstSeen', item)}</>,
  },
  {
    name: 'OS',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.os', item)}</>,
  },
  {
    name: 'Version',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.version', item)}</>,
  },
];
