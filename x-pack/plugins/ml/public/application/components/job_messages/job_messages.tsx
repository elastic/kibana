/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiSpacer, EuiInMemoryTable } from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { i18n } from '@kbn/i18n';
import theme from '@elastic/eui/dist/eui_theme_light.json';

import { JobMessage } from '../../../../common/types/audit_message';
import { JobIcon } from '../job_message_icon';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

interface JobMessagesProps {
  messages: JobMessage[];
  loading: boolean;
  error: string;
}

/**
 * Component for rendering job messages for anomaly detection
 * and data frame analytics jobs.
 */
export const JobMessages: FC<JobMessagesProps> = ({ messages, loading, error }) => {
  const columns = [
    {
      name: '',
      render: (message: JobMessage) => <JobIcon message={message} />,
      width: `${theme.euiSizeL}`,
    },
    {
      field: 'timestamp',
      name: i18n.translate('xpack.ml.jobMessages.timeLabel', {
        defaultMessage: 'Time',
      }),
      render: (timestamp: number) => formatDate(timestamp, TIME_FORMAT),
      width: '120px',
      sortable: true,
    },
    {
      field: 'node_name',
      name: i18n.translate('xpack.ml.jobMessages.nodeLabel', {
        defaultMessage: 'Node',
      }),
      width: '150px',
    },
    {
      field: 'message',
      name: i18n.translate('xpack.ml.jobMessages.messageLabel', {
        defaultMessage: 'Message',
      }),
      width: '50%',
    },
  ];

  const defaultSorting = {
    sort: {
      field: 'timestamp' as const,
      direction: 'asc' as const,
    },
  };

  return (
    <>
      <EuiSpacer size="s" />
      <EuiInMemoryTable
        className="job-messages-table"
        items={messages}
        columns={columns}
        sorting={defaultSorting}
        compressed={true}
        loading={loading}
        error={error}
      />
    </>
  );
};
