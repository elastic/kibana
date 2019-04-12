/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { EuiButton, EuiInMemoryTable, EuiLink } from '@elastic/eui';

import { SnapshotDetails } from '../../../../../../common/types';
import { useAppDependencies } from '../../../../index';
import { formatDate } from '../../../../services/text';
import { linkToRepository } from '../../../../services/navigation';

interface Props extends RouteComponentProps {
  snapshots: SnapshotDetails[];
  reload: () => Promise<void>;
  openSnapshotDetails: (repositoryName: string, snapshotId: string) => void;
}

const SnapshotTableUi: React.FunctionComponent<Props> = ({
  snapshots,
  reload,
  openSnapshotDetails,
  history,
}) => {
  const {
    core: {
      i18n: { FormattedMessage, translate },
    },
  } = useAppDependencies();

  const columns = [
    {
      field: 'snapshot',
      name: translate('xpack.snapshotRestore.snapshotList.table.snapshotColumnTitle', {
        defaultMessage: 'Snapshot',
      }),
      truncateText: true,
      sortable: true,
      render: (snapshotId: string, snapshot: SnapshotDetails) => (
        <EuiLink onClick={() => openSnapshotDetails(snapshot.repository, snapshotId)}>
          {snapshotId}
        </EuiLink>
      ),
    },
    {
      field: 'repository',
      name: translate('xpack.snapshotRestore.snapshotList.table.repositoryColumnTitle', {
        defaultMessage: 'Repository',
      }),
      truncateText: true,
      sortable: true,
      render: (repositoryName: string) => (
        <EuiLink href={linkToRepository(repositoryName)}>
          {repositoryName}
        </EuiLink>
      ),
    },
    {
      field: 'startTimeInMillis',
      name: translate('xpack.snapshotRestore.snapshotList.table.startTimeColumnTitle', {
        defaultMessage: 'Date created',
      }),
      truncateText: true,
      sortable: true,
      render: (startTimeInMillis: number) => formatDate(startTimeInMillis),
    },
    {
      field: 'durationInMillis',
      name: translate('xpack.snapshotRestore.snapshotList.table.durationColumnTitle', {
        defaultMessage: 'Duration',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (durationInMillis: number) => (
        <FormattedMessage
          id="xpack.snapshotRestore.snapshotList.table.durationColumnValueLabel"
          defaultMessage="{seconds}s"
          values={{ seconds: Math.round(durationInMillis / 1000) }}
        />
      ),
    },
    {
      field: 'indices',
      name: translate('xpack.snapshotRestore.snapshotList.table.indicesColumnTitle', {
        defaultMessage: 'Indices',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (indices: string[]) => indices.length,
    },
    {
      field: 'shards.total',
      name: translate('xpack.snapshotRestore.snapshotList.table.shardsColumnTitle', {
        defaultMessage: 'Shards',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (totalShards: number) => totalShards,
    },
    {
      field: 'shards.failed',
      name: translate('xpack.snapshotRestore.snapshotList.table.failedShardsColumnTitle', {
        defaultMessage: 'Failed shards',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (failedShards: number) => failedShards,
    },
  ];

  // By default, we'll display the most recent snapshots at the top of the table.
  const sorting = {
    sort: {
      field: 'startTimeInMillis',
      direction: 'desc',
    },
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const search = {
    toolsRight: (
      <EuiButton color="secondary" iconType="refresh" onClick={reload}>
        <FormattedMessage
          id="xpack.snapshotRestore.snapshotList.table.reloadSnapshotsButton"
          defaultMessage="Reload"
        />
      </EuiButton>
    ),
    box: {
      incremental: true,
      schema: true,
    },
  };

  return (
    <EuiInMemoryTable
      items={snapshots}
      itemId="name"
      columns={columns}
      search={search}
      sorting={sorting}
      pagination={pagination}
      rowProps={() => ({
        'data-test-subj': 'srSnapshotListTableRow',
      })}
      cellProps={(item: any, column: any) => ({
        'data-test-subj': `srSnapshotListTableCell-${column.field}`,
      })}
    />
  );
};

export const SnapshotTable = withRouter(SnapshotTableUi);
