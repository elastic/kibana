/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiSpacer, EuiBasicTable } from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { euiLightVars as theme } from '@kbn/ui-theme';

import { i18n } from '@kbn/i18n';

import { isGetTransformsAuditMessagesResponseSchema } from '../../../../../../common/api_schemas/type_guards';
import { TransformMessage } from '../../../../../../common/types/messages';

import { useApi } from '../../../../hooks/use_api';
import { JobIcon } from '../../../../components/job_icon';
import { useRefreshTransformList } from '../../../../common';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

interface Props {
  transformId: string;
}

export const ExpandedRowMessagesPane: React.FC<Props> = ({ transformId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const api = useApi();

  const getMessagesFactory = () => {
    let concurrentLoads = 0;

    return async function getMessages() {
      concurrentLoads++;

      if (concurrentLoads > 1) {
        return;
      }

      setIsLoading(true);
      const messagesResp = await api.getTransformAuditMessages(transformId);

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
      setMessages(messagesResp as any[]);

      concurrentLoads--;

      if (concurrentLoads > 0) {
        concurrentLoads = 0;
        getMessages();
      }
    };
  };

  useRefreshTransformList({ onRefresh: getMessagesFactory() });

  const columns = [
    {
      name: '',
      render: (message: TransformMessage) => <JobIcon message={message} />,
      width: `${theme.euiSizeXL}px`,
    },
    {
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.messagesPane.timeLabel',
        {
          defaultMessage: 'Time',
        }
      ),
      render: (message: any) => formatDate(message.timestamp, TIME_FORMAT),
    },
    {
      field: 'node_name',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.messagesPane.nodeLabel',
        {
          defaultMessage: 'Node',
        }
      ),
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
    const list = messages;
    const listLength = list.length;
    const pageStart = index * size;

    return {
      pageOfMessages: list.slice(pageStart, pageStart + size),
      totalItemCount: listLength,
    };
  };

  const onChange = ({
    page = { index: 0, size: 10 },
  }: {
    page?: { index: number; size: number };
  }) => {
    const { index, size } = page;

    setPageIndex(index);
    setPageSize(size);
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
      />
    </div>
  );
};
