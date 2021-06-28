/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import moment from 'moment';

import {
  EuiBasicTableColumn,
  EuiSpacer,
  EuiInMemoryTable,
  EuiButton,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import theme from '@elastic/eui/dist/eui_theme_light.json';

import { JobMessage } from '../../../../common/types/audit_message';
import { JobIcon } from '../job_message_icon';
import { timeFormatter } from '../../../../common/util/date_utils';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { useMlKibana } from '../../../application/contexts/kibana';

interface JobMessagesProps {
  jobId: string;
  messages: JobMessage[];
  loading: boolean;
  error: string;
  refreshMessage?: React.MouseEventHandler<HTMLButtonElement>;
  actionHandler?: (message: JobMessage) => void;
}

/**
 * Component for rendering job messages for anomaly detection
 * and data frame analytics jobs.
 */
export const JobMessages: FC<JobMessagesProps> = ({
  jobId,
  messages,
  loading,
  error,
  refreshMessage,
  actionHandler,
}) => {
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const toastNotificationService = useToastNotificationService();

  const {
    services: {
      mlServices: {
        mlApiServices: {
          jobs: { clearJobAuditMessages },
        },
      },
    },
  } = useMlKibana();

  const columns: Array<EuiBasicTableColumn<JobMessage>> = [
    {
      name: refreshMessage ? (
        <EuiToolTip
          content={i18n.translate('xpack.ml.jobMessages.refreshLabel', {
            defaultMessage: 'Refresh',
          })}
        >
          <EuiButtonIcon
            onClick={refreshMessage}
            iconType="refresh"
            aria-label={i18n.translate('xpack.ml.jobMessages.refreshAriaLabel', {
              defaultMessage: 'Refresh',
            })}
          />
        </EuiToolTip>
      ) : (
          ''
        ),
      render: (message: JobMessage) => <JobIcon message={message} />,
      width: `${theme.euiSizeL}`,
    },
    {
      field: 'timestamp',
      name: i18n.translate('xpack.ml.jobMessages.timeLabel', {
        defaultMessage: 'Time',
      }),
      render: timeFormatter,
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

  if (typeof actionHandler === 'function') {
    columns.push({
      name: i18n.translate('xpack.ml.jobMessages.actionsLabel', {
        defaultMessage: 'Actions',
      }),
      width: '10%',
      actions: [
        {
          render: (message: JobMessage) => {
            return (
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.ml.jobMessages.toggleInChartTooltipText"
                    defaultMessage="Toggle in chart"
                  />
                }
              >
                <EuiButtonIcon
                  size="xs"
                  aria-label={i18n.translate('xpack.ml.jobMessages.toggleInChartAriaLabel', {
                    defaultMessage: 'Toggle in chart',
                  })}
                  iconType="visAreaStacked"
                  onClick={() => actionHandler(message)}
                />
              </EuiToolTip>
            );
          },
        },
      ],
    });
  }

  const defaultSorting = {
    sort: {
      field: 'timestamp' as const,
      direction: 'asc' as const,
    },
  };

  // latest timestamp of message - 24hrs
  const clearMessages = async () => {
    setIsClearing(true);
    const nowMoment = moment(new Date().getTime());
    // @ts-ignore
    const twentyFourHoursAgo = nowMoment.subtract(24, 'hours').valueOf();
    const start = '';
    const end = '';
    try {
      await clearJobAuditMessages(jobId, start, end);
      setIsClearing(false);
    } catch (e) {
      setIsClearing(false);
      toastNotificationService.displayErrorToast(
        e,
        i18n.translate('xpack.ml.jobMessages.clearJobAuditMessagesErrorTitle', {
          defaultMessage: 'Error clearning job message warnings and errors',
        })
      );
    }
  };
  // TODO: if index is .ml-notifications or .ml-notifications-0001 then disable
  const disabled = false;
  // TODO: add tooltip explaining it clears for last 24hrs
  return (
    <>
      <EuiSpacer size="s" />
      <EuiButton
        isLoading={isClearing}
        isDisabled={disabled}
        onClick={clearMessages}
        data-test-subj="mlJobMessagesClearButton"
      >
        <FormattedMessage
          id="xpack.ml.jobMessages.clearMessagesLabel"
          defaultMessage="Clear messages"
        />
      </EuiButton>
      <EuiInMemoryTable
        className="job-messages-table"
        items={messages}
        columns={columns}
        sorting={defaultSorting}
        compressed={true}
        loading={loading}
        error={error}
        pagination={true}
        data-test-subj={'mlAnalyticsDetailsJobMessagesTable'}
      />
    </>
  );
};
