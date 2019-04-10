/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiInMemoryTable, EuiLink } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { SnapshotDetails } from '../../../../../../common/types';
import { useAppDependencies } from '../../../../index';

const DATE_FORMAT = 'MMMM Do, YYYY h:mm:ss A';

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
      // We deliberately don't link to the repository from here because the API request for populating
      // this table takes so long, and navigating away by accident is a really poor UX.
      render: (repository: string) => repository,
    },
    {
      field: 'startTimeInMillis',
      name: translate('xpack.snapshotRestore.snapshotList.table.startTimeColumnTitle', {
        defaultMessage: 'Date created',
      }),
      truncateText: true,
      sortable: true,
      render: (startTimeInMillis: number) =>
        moment.unix(Number(startTimeInMillis)).format(DATE_FORMAT),
    },
    {
      field: 'durationInMillis',
      name: translate('xpack.snapshotRestore.snapshotList.table.durationColumnTitle', {
        defaultMessage: 'Duration',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (durationInMillis: number) => Math.round(durationInMillis / 1000),
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
