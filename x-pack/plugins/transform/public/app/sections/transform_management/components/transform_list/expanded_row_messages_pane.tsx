/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useState } from 'react';

import {
  EuiSpacer,
  EuiBasicTable,
  EuiBasicTableProps,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { euiLightVars as theme } from '@kbn/ui-theme';

import { i18n } from '@kbn/i18n';

import { DEFAULT_MAX_AUDIT_MESSAGE_SIZE } from '../../../../../../common/constants';
import { isGetTransformsAuditMessagesResponseSchema } from '../../../../../../common/api_schemas/type_guards';
import { TransformMessage } from '../../../../../../common/types/messages';

import { useApi } from '../../../../hooks/use_api';
import { JobIcon } from '../../../../components/job_icon';
import { useRefreshTransformList } from '../../../../common';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

interface Props {
  transformId: string;
}

interface Sorting {
  field: keyof TransformMessage;
  direction: 'asc' | 'desc';
}

export const ExpandedRowMessagesPane: React.FC<Props> = ({ transformId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [msgCount, setMsgCount] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<{ sort: Sorting }>({
    sort: {
      field: 'timestamp' as const,
      direction: 'desc' as const,
    },
  });

  const api = useApi();

  const getMessagesFactory = (
    sortField: keyof TransformMessage = 'timestamp',
    sortDirection: 'asc' | 'desc' = 'desc'
  ) => {
    let concurrentLoads = 0;

    return async function getMessages() {
      concurrentLoads++;

      if (concurrentLoads > 1) {
        return;
      }

      setIsLoading(true);
      const messagesResp = await api.getTransformAuditMessages(
        transformId,
        sortField,
        sortDirection
      );

      if (!isGetTransformsAuditMessagesResponseSchema(messagesResp)) {
        setIsLoading(false);
        setErrorMessage(
          i18n.translate(
            'xpack.transform.transformList.transformDetails.messagesPane.errorMessage',
            {
              defaultMessage: 'Messages could not be loaded',
            }
          )
        );
        return;
      }

      setIsLoading(false);
      setMessages(messagesResp.messages);
      setMsgCount(messagesResp.total);

      concurrentLoads--;

      if (concurrentLoads > 0) {
        concurrentLoads = 0;
        getMessages();
      }
    };
  };
  const { refresh: refreshMessage } = useRefreshTransformList({ onRefresh: getMessagesFactory() });

  const columns = [
    {
      name: refreshMessage ? (
        <EuiToolTip
          content={i18n.translate('xpack.transform.transformList.refreshLabel', {
            defaultMessage: 'Refresh',
          })}
        >
          <EuiButtonIcon
            // TODO: Replace this with ML's blurButtonOnClick when it's moved to a shared package
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              (e.currentTarget as HTMLButtonElement).blur();
              refreshMessage();
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
    {
      field: 'message',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.messagesPane.messageLabel',
        {
          defaultMessage: 'Message',
        }
      ),
      width: '50%',
    },
  ];

  const getPageOfMessages = ({ index, size }: { index: number; size: number }) => {
    let list = messages;
    if (msgCount <= DEFAULT_MAX_AUDIT_MESSAGE_SIZE) {
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

      // Since we only show 500 messages, if user wants oldest messages first
      // we need to make sure we fetch them from elasticsearch
      if (msgCount > DEFAULT_MAX_AUDIT_MESSAGE_SIZE) {
        getMessagesFactory(sort.field, sort.direction)();
      }
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
    <div data-test-subj="transformMessagesTabContent">
      <EuiSpacer size="s" />
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
    </div>
  );
};
