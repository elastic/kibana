/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiBasicTableColumn } from '@elastic/eui';

import { DataStream } from '../../../../../../common/types';

interface Props {
  dataStreams?: DataStream[];
}

export const DataStreamTable: React.FunctionComponent<Props> = ({ dataStreams }) => {
  const columns: Array<EuiBasicTableColumn<DataStream>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.idxMgmt.dataStreamList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
      // TODO: Render as a link to open the detail panel
    },
    {
      field: 'indices',
      name: i18n.translate('xpack.idxMgmt.dataStreamList.table.indicesColumnTitle', {
        defaultMessage: 'Indices',
      }),
      truncateText: true,
      sortable: true,
      // TODO: Render as a deep-link into the indices tab
      render: (indices: DataStream['indices']) => indices.length,
    },
    {
      field: 'timeStampField',
      name: i18n.translate('xpack.idxMgmt.dataStreamList.table.timeStampFieldColumnTitle', {
        defaultMessage: 'Timestamp field',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'generation',
      name: i18n.translate('xpack.idxMgmt.dataStreamList.table.generationFieldColumnTitle', {
        defaultMessage: 'Generation',
      }),
      truncateText: true,
      sortable: true,
    },
  ];

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

  const searchConfig = {
    box: {
      incremental: true,
    },
    toolsLeft: undefined /* TODO: Actions menu */,
    toolsRight: [
      /* TODO: Reload button */
    ],
  };

  return (
    <>
      <EuiInMemoryTable
        items={dataStreams || []}
        itemId="name"
        columns={columns}
        search={searchConfig}
        sorting={sorting}
        isSelectable={true}
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
