/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiBasicTableColumn, EuiButton, EuiLink } from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';

import { DataStream } from '../../../../../../common/types';
import { reactRouterNavigate } from '../../../../../shared_imports';
import { encodePathForReactRouter } from '../../../../services/routing';
import { DataHealth } from '../../../../components';
import { Section } from '../../../home';
import { DeleteDataStreamConfirmationModal } from '../delete_data_stream_confirmation_modal';
import { humanizeTimeStamp } from '../humanize_time_stamp';

interface Props {
  dataStreams?: DataStream[];
  reload: () => {};
  history: ScopedHistory;
  includeStats: boolean;
  filters?: string;
}

export const DataStreamTable: React.FunctionComponent<Props> = ({
  dataStreams,
  reload,
  history,
  filters,
  includeStats,
}) => {
  const [selection, setSelection] = useState<DataStream[]>([]);
  const [dataStreamsToDelete, setDataStreamsToDelete] = useState<string[]>([]);

  const columns: Array<EuiBasicTableColumn<DataStream>> = [];

  columns.push({
    field: 'name',
    name: i18n.translate('xpack.idxMgmt.dataStreamList.table.nameColumnTitle', {
      defaultMessage: 'Name',
    }),
    truncateText: true,
    sortable: true,
    render: (name: DataStream['name'], item: DataStream) => {
      return (
        <EuiLink
          data-test-subj="nameLink"
          {...reactRouterNavigate(history, {
            pathname: `/${Section.DataStreams}/${encodePathForReactRouter(name)}`,
          })}
        >
          {name}
        </EuiLink>
      );
    },
  });

  columns.push({
    field: 'health',
    name: i18n.translate('xpack.idxMgmt.dataStreamList.table.healthColumnTitle', {
      defaultMessage: 'Health',
    }),
    truncateText: true,
    sortable: true,
    render: (health: DataStream['health']) => {
      return <DataHealth health={health} />;
    },
  });

  if (includeStats) {
    columns.push({
      field: 'maxTimeStamp',
      name: i18n.translate('xpack.idxMgmt.dataStreamList.table.maxTimeStampColumnTitle', {
        defaultMessage: 'Last updated',
      }),
      width: '300px',
      truncateText: true,
      sortable: true,
      render: (maxTimeStamp: DataStream['maxTimeStamp']) =>
        maxTimeStamp
          ? humanizeTimeStamp(maxTimeStamp)
          : i18n.translate('xpack.idxMgmt.dataStreamList.table.maxTimeStampColumnNoneMessage', {
              defaultMessage: 'Never',
            }),
    });

    columns.push({
      field: 'storageSize',
      name: i18n.translate('xpack.idxMgmt.dataStreamList.table.storageSizeColumnTitle', {
        defaultMessage: 'Storage size',
      }),
      truncateText: true,
      sortable: true,
    });
  }

  columns.push({
    field: 'indices',
    name: i18n.translate('xpack.idxMgmt.dataStreamList.table.indicesColumnTitle', {
      defaultMessage: 'Indices',
    }),
    truncateText: true,
    sortable: true,
    render: (indices: DataStream['indices'], dataStream) => (
      <EuiLink
        data-test-subj="indicesLink"
        {...reactRouterNavigate(history, {
          pathname: '/indices',
          search: `includeHiddenIndices=true&filter=data_stream=${encodePathForReactRouter(
            dataStream.name
          )}`,
        })}
      >
        {indices.length}
      </EuiLink>
    ),
  });

  columns.push({
    name: i18n.translate('xpack.idxMgmt.dataStreamList.table.actionColumnTitle', {
      defaultMessage: 'Actions',
    }),
    actions: [
      {
        name: i18n.translate('xpack.idxMgmt.dataStreamList.table.actionDeleteText', {
          defaultMessage: 'Delete',
        }),
        description: i18n.translate('xpack.idxMgmt.dataStreamList.table.actionDeleteDecription', {
          defaultMessage: 'Delete this data stream',
        }),
        icon: 'trash',
        color: 'danger',
        type: 'icon',
        onClick: ({ name }: DataStream) => {
          setDataStreamsToDelete([name]);
        },
        isPrimary: true,
        'data-test-subj': 'deleteDataStream',
      },
    ],
  });

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const sorting = {
    sort: {
      field: 'name',
      direction: 'asc',
    },
  } as const;

  const selectionConfig = {
    onSelectionChange: setSelection,
  };

  const searchConfig = {
    query: filters,
    box: {
      incremental: true,
    },
    toolsLeft:
      selection.length > 0 ? (
        <EuiButton
          data-test-subj="deletDataStreamsButton"
          onClick={() => setDataStreamsToDelete(selection.map(({ name }: DataStream) => name))}
          color="danger"
        >
          <FormattedMessage
            id="xpack.idxMgmt.dataStreamList.table.deleteDataStreamsButtonLabel"
            defaultMessage="Delete {count, plural, one {data stream} other {data streams} }"
            values={{ count: selection.length }}
          />
        </EuiButton>
      ) : undefined,
    toolsRight: [
      <EuiButton
        color="secondary"
        iconType="refresh"
        onClick={reload}
        data-test-subj="reloadButton"
        key="reloadButton"
      >
        <FormattedMessage
          id="xpack.idxMgmt.dataStreamList.reloadDataStreamsButtonLabel"
          defaultMessage="Reload"
        />
      </EuiButton>,
    ],
  };

  return (
    <>
      {dataStreamsToDelete && dataStreamsToDelete.length > 0 ? (
        <DeleteDataStreamConfirmationModal
          onClose={(data) => {
            if (data && data.hasDeletedDataStreams) {
              reload();
            } else {
              setDataStreamsToDelete([]);
            }
          }}
          dataStreams={dataStreamsToDelete}
        />
      ) : null}
      <EuiInMemoryTable
        items={dataStreams || []}
        itemId="name"
        columns={columns}
        search={searchConfig}
        sorting={sorting}
        isSelectable={true}
        selection={selectionConfig}
        pagination={pagination}
        rowProps={() => ({
          'data-test-subj': 'row',
        })}
        cellProps={() => ({
          'data-test-subj': 'cell',
        })}
        data-test-subj="dataStreamTable"
        message={
          <FormattedMessage
            id="xpack.idxMgmt.dataStreamList.table.noDataStreamsMessage"
            defaultMessage="No data streams found"
          />
        }
      />
    </>
  );
};
