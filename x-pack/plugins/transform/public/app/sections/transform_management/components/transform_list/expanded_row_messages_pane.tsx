/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import React, { useState, type FC } from 'react';

import type { EuiBasicTableProps } from '@elastic/eui';
import { formatDate, EuiPanel, EuiBasicTable, EuiToolTip, EuiButtonIcon } from '@elastic/eui';

import { euiLightVars as theme } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';

import { useEnabledFeatures } from '../../../../serverless_context';
import { DEFAULT_MAX_AUDIT_MESSAGE_SIZE, TIME_FORMAT } from '../../../../../../common/constants';
import type { TransformMessage } from '../../../../../../common/types/messages';

import { JobIcon } from '../../../../components/job_icon';
import { useGetTransformAuditMessages, useRefreshTransformList } from '../../../../hooks';

interface ExpandedRowMessagesPaneProps {
  transformId: string;
}

interface Sorting {
  field: keyof TransformMessage;
  direction: 'asc' | 'desc';
}

export const ExpandedRowMessagesPane: FC<ExpandedRowMessagesPaneProps> = ({ transformId }) => {
  const { showNodeInfo } = useEnabledFeatures();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<{ sort: Sorting }>({
    sort: {
      field: 'timestamp' as const,
      direction: 'desc' as const,
    },
  });

  const {
    isLoading,
    error,
    data = { messages: [], total: 0 },
  } = useGetTransformAuditMessages(transformId, sorting.sort.field, sorting.sort.direction);
  const { messages, total } = data;
  const errorMessage =
    error !== null
      ? i18n.translate('xpack.transform.transformList.transformDetails.messagesPane.errorMessage', {
          defaultMessage: 'Messages could not be loaded',
        })
      : '';

  const refreshTransformList = useRefreshTransformList();

  const columns = [
    {
      name: refreshTransformList ? (
        <EuiToolTip
          content={i18n.translate('xpack.transform.transformList.refreshLabel', {
            defaultMessage: 'Refresh',
          })}
        >
          <EuiButtonIcon
            // TODO: Replace this with ML's blurButtonOnClick when it's moved to a shared package
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              (e.currentTarget as HTMLButtonElement).blur();
              refreshTransformList();
            }}
            iconType="refresh"
            aria-label={i18n.translate('xpack.transform.transformList.refreshAriaLabel', {
              defaultMessage: 'Refresh',
            })}
          />
        </EuiToolTip>
      ) : (
        ''
      ),
      render: (message: TransformMessage) => <JobIcon message={message} />,
      width: theme.euiSizeXL,
    },
    {
      field: 'timestamp',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.messagesPane.timeLabel',
        {
          defaultMessage: 'Time',
        }
      ),
      render: (timestamp: number) => formatDate(timestamp, TIME_FORMAT),
      sortable: true,
    },
    ...(showNodeInfo
      ? [
          {
            field: 'node_name',
            name: i18n.translate(
              'xpack.transform.transformList.transformDetails.messagesPane.nodeLabel',
              {
                defaultMessage: 'Node',
              }
            ),
            sortable: true,
          },
        ]
      : []),
    {
      field: 'message',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.messagesPane.messageLabel',
        {
          defaultMessage: 'Message',
        }
      ),
      width: showNodeInfo ? '50%' : '70%',
    },
  ];

  const getPageOfMessages = ({ index, size }: { index: number; size: number }) => {
    let list = messages;
    if (total <= DEFAULT_MAX_AUDIT_MESSAGE_SIZE) {
      const sortField = sorting.sort.field ?? 'timestamp';
      list = messages.sort((a: TransformMessage, b: TransformMessage) => {
        const prev = a[sortField] as any;
        const curr = b[sortField] as any;
        return sorting.sort.direction === 'asc' ? prev - curr : curr - prev;
      });
    }
    const listLength = list.length;
    const pageStart = index * size;

    return {
      pageOfMessages: list.slice(pageStart, pageStart + size),
      totalItemCount: listLength,
    };
  };

  const onChange: EuiBasicTableProps<TransformMessage>['onChange'] = ({
    page = { index: 0, size: 10 },
    sort,
  }: {
    page?: { index: number; size: number };
    sort?: Sorting;
  }) => {
    const { index, size } = page;

    setPageIndex(index);
    setPageSize(size);
    if (sort) {
      setSorting({ sort });
    }
  };

  const { pageOfMessages, totalItemCount } = getPageOfMessages({
    index: pageIndex,
    size: pageSize,
  });

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [10, 20, 50],
    showPerPageOptions: true,
  };

  return (
    <EuiPanel
      color="transparent"
      hasBorder={false}
      paddingSize="s"
      data-test-subj="transformMessagesTabContent"
    >
      <EuiBasicTable
        className="transform__TransformTable__messagesPaneTable"
        items={pageOfMessages}
        columns={columns}
        compressed={true}
        loading={isLoading}
        error={errorMessage}
        pagination={pagination}
        onChange={onChange}
        sorting={sorting}
      />
    </EuiPanel>
  );
};
