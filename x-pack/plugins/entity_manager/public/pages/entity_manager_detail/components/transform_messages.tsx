/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformGetTransformTransformSummary } from '@elastic/elasticsearch/lib/api/types';
import React, { useState } from 'react';
import {
  Criteria,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiIcon,
  EuiSpacer,
  EuiTableSortingType,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import {
  TransformMessage,
  useFetchTransformMessages,
} from '../../../hooks/use_fetch_transform_messages';

interface TransformMessagesProps {
  transform: TransformGetTransformTransformSummary;
}

export function TransformMessages({ transform }: TransformMessagesProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof TransformMessage>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { data, refetch } = useFetchTransformMessages(transform.id, sortField, sortDirection);

  const columns: Array<EuiBasicTableColumn<TransformMessage>> = [
    {
      field: 'icon',
      name: (
        <EuiToolTip
          content={i18n.translate('xpack.entityManager.transformMessages.tooltipRefreshLabel', {
            defaultMessage: 'Refresh',
          })}
        >
          <EuiButtonIcon
            onClick={() => refetch()}
            data-test-subj="entityManagerTransformMessagesButton"
            iconType="refresh"
          />
        </EuiToolTip>
      ),
      render: () => <EuiIcon type="clock" />,
      align: 'center',
      width: '30px',
    },
    {
      field: 'timestamp',
      name: i18n.translate('xpack.entityManager.transformMessages.timestampLabel', {
        defaultMessage: 'Timestamp',
      }),
      sortable: true,
      render: (value: string) => moment(value).format('ll HH:mm:ss'),
      width: '20%',
    },
    {
      field: 'message',
      name: i18n.translate('xpack.entityManager.transformMessages.messageLabel', {
        defaultMessage: 'Message',
      }),
      sortable: false,
    },
  ];

  const sorting: EuiTableSortingType<TransformMessage> = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const handleTableChange = ({ sort, page }: Criteria<TransformMessage>) => {
    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
    }

    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const items = (data?.messages ?? []).slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

  const pagination = {
    pageSize,
    pageIndex,
    totalItemCount: data?.total || 0,
    pageSizeOptions: [10, 20, 50],
    showPerPageOptions: true,
  };

  return (
    <>
      <EuiSpacer size="s" />
      <EuiBasicTable
        compressed
        columns={columns}
        items={items}
        sorting={sorting}
        onChange={handleTableChange}
        pagination={pagination}
      />
    </>
  );
}
