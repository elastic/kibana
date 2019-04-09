/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiInMemoryTable, EuiLink } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { Snapshot } from '../../../../../../common/types';
import { useAppDependencies } from '../../../../index';

const DATE_FORMAT = 'MMMM Do, YYYY h:mm:ss A';

interface Props extends RouteComponentProps {
  snapshots: Snapshot[];
  reload: () => Promise<void>;
  openSnapshotDetails: (id: string) => void;
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
      field: 'id',
      name: translate('xpack.snapshotRestore.snapshotList.table.idColumnTitle', {
        defaultMessage: 'ID',
      }),
      truncateText: true,
      sortable: true,
      render: (id: string, snapshot: Snapshot) => (
        <EuiLink onClick={() => openSnapshotDetails(id)}>{id}</EuiLink>
      ),
    },
    {
      field: 'summary.startEpoch',
      name: translate('xpack.snapshotRestore.snapshotList.table.startTimeColumnTitle', {
        defaultMessage: 'Date created',
      }),
      truncateText: true,
      sortable: true,
      render: (startEpoch: string) => moment.unix(Number(startEpoch)).format(DATE_FORMAT),
    },
    {
      field: 'summary.duration',
      name: translate('xpack.snapshotRestore.snapshotList.table.durationColumnTitle', {
        defaultMessage: 'Duration',
      }),
      truncateText: true,
      sortable: true,
      width: '120px',
      render: (duration: string) => duration,
    },
    {
      field: 'summary.indices',
      name: translate('xpack.snapshotRestore.snapshotList.table.indicesColumnTitle', {
        defaultMessage: 'Indices',
      }),
      truncateText: true,
      sortable: true,
      width: '120px',
      render: (indices: string) => indices,
    },
    {
      field: 'summary.totalShards',
      name: translate('xpack.snapshotRestore.snapshotList.table.shardsColumnTitle', {
        defaultMessage: 'Shards',
      }),
      truncateText: true,
      sortable: true,
      width: '120px',
      render: (totalShards: string) => totalShards,
    },
    {
      field: 'summary.failedShards',
      name: translate('xpack.snapshotRestore.snapshotList.table.failedShardsColumnTitle', {
        defaultMessage: 'Failed shards',
      }),
      truncateText: true,
      sortable: true,
      width: '120px',
      render: (failedShards: string) => failedShards,
    },
  ];

  const sorting = {
    sort: {
      field: 'id',
      direction: 'asc',
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
