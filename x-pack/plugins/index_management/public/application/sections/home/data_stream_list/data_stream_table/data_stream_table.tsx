/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiLink,
  EuiIcon,
  EuiToolTip,
  EuiTextColor,
} from '@elastic/eui';
import { ScopedHistory } from '@kbn/core/public';

import { useAppContext } from '../../../../app_context';
import { DataStream } from '../../../../../../common/types';
import { getLifecycleValue } from '../../../../lib/data_streams';
import { UseRequestResponse, reactRouterNavigate } from '../../../../../shared_imports';
import { getDataStreamDetailsLink, getIndexListUri } from '../../../../services/routing';
import { DataHealth } from '../../../../components';
import { DeleteDataStreamConfirmationModal } from '../delete_data_stream_confirmation_modal';
import { humanizeTimeStamp } from '../humanize_time_stamp';
import { DataStreamsBadges } from '../data_stream_badges';
import { ConditionalWrap } from '../data_stream_detail_panel';
import { isDataStreamFullyManagedByILM } from '../../../../lib/data_streams';

interface TableDataStream extends DataStream {
  isDataStreamFullyManagedByILM: boolean;
}

interface Props {
  dataStreams?: DataStream[];
  reload: UseRequestResponse['resendRequest'];
  history: ScopedHistory;
  includeStats: boolean;
  filters?: string;
}

const INFINITE_AS_ICON = true;

export const DataStreamTable: React.FunctionComponent<Props> = ({
  dataStreams,
  reload,
  history,
  filters,
  includeStats,
}) => {
  const [selection, setSelection] = useState<DataStream[]>([]);
  const [dataStreamsToDelete, setDataStreamsToDelete] = useState<string[]>([]);
  const { config } = useAppContext();

  const data = useMemo(() => {
    return (dataStreams || []).map((dataStream) => ({
      ...dataStream,
      isDataStreamFullyManagedByILM: isDataStreamFullyManagedByILM(dataStream),
    }));
  }, [dataStreams]);

  const columns: Array<EuiBasicTableColumn<TableDataStream>> = [];

  columns.push({
    field: 'name',
    name: i18n.translate('xpack.idxMgmt.dataStreamList.table.nameColumnTitle', {
      defaultMessage: 'Name',
    }),
    truncateText: true,
    sortable: true,
    render: (name: DataStream['name'], dataStream: DataStream) => {
      return (
        <Fragment>
          <EuiLink
            data-test-subj="nameLink"
            {...reactRouterNavigate(history, getDataStreamDetailsLink(name))}
          >
            {name}
          </EuiLink>
          <DataStreamsBadges dataStream={dataStream} />
        </Fragment>
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
      truncateText: true,
      sortable: true,
      render: (maxTimeStamp: DataStream['maxTimeStamp']) =>
        maxTimeStamp
          ? humanizeTimeStamp(maxTimeStamp)
          : i18n.translate('xpack.idxMgmt.dataStreamList.table.maxTimeStampColumnNoneMessage', {
              defaultMessage: 'Never',
            }),
    });

    if (config.enableDataStreamsStorageColumn) {
      columns.push({
        field: 'storageSizeBytes',
        name: i18n.translate('xpack.idxMgmt.dataStreamList.table.storageSizeColumnTitle', {
          defaultMessage: 'Storage size',
        }),
        truncateText: true,
        sortable: true,
        render: (storageSizeBytes: DataStream['storageSizeBytes'], dataStream: DataStream) =>
          dataStream.storageSize,
      });
    }
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
        {...reactRouterNavigate(history, getIndexListUri(`data_stream="${dataStream.name}"`, true))}
      >
        {indices.length}
      </EuiLink>
    ),
  });

  columns.push({
    field: 'lifecycle',
    name: (
      <EuiToolTip
        content={i18n.translate('xpack.idxMgmt.dataStreamList.table.dataRetentionColumnTooltip', {
          defaultMessage: `Data is kept at least this long before being automatically deleted. The data retention value only applies to the data managed directly by the data stream. If some data is subject to an index lifecycle management policy, then the data retention value set for the data stream doesn't apply to that data.`,
        })}
      >
        <span>
          {i18n.translate('xpack.idxMgmt.dataStreamList.table.dataRetentionColumnTitle', {
            defaultMessage: 'Data retention',
          })}{' '}
          <EuiIcon size="s" color="subdued" type="questionInCircle" />
        </span>
      </EuiToolTip>
    ),
    truncateText: true,
    sortable: true,
    render: (lifecycle: DataStream['lifecycle'], dataStream) => (
      <ConditionalWrap
        condition={dataStream.isDataStreamFullyManagedByILM}
        wrap={(children) => <EuiTextColor color="subdued">{children}</EuiTextColor>}
      >
        <>{getLifecycleValue(lifecycle, INFINITE_AS_ICON)}</>
      </ConditionalWrap>
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
        description: i18n.translate('xpack.idxMgmt.dataStreamList.table.actionDeleteDescription', {
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
        available: ({ privileges: { delete_index: deleteIndex } }: DataStream) => deleteIndex,
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
      selection.length > 0 &&
      selection.every((dataStream: DataStream) => dataStream.privileges.delete_index) ? (
        <EuiButton
          data-test-subj="deleteDataStreamsButton"
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
        color="success"
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
          onClose={(res) => {
            if (res && res.hasDeletedDataStreams) {
              reload();
            } else {
              setDataStreamsToDelete([]);
            }
          }}
          dataStreams={dataStreamsToDelete}
        />
      ) : null}
      <EuiInMemoryTable
        items={data}
        itemId="name"
        columns={columns}
        search={searchConfig}
        sorting={sorting}
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
        tableLayout={'auto'}
      />
    </>
  );
};
