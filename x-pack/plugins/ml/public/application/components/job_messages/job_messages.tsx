/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';

import {
  EuiBasicTableColumn,
  EuiSpacer,
  EuiInMemoryTable,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { timeFormatter } from '@kbn/ml-date-utils';

import { JobMessage } from '../../../../common/types/audit_message';

import { blurButtonOnClick } from '../../util/component_utils';

import { JobIcon } from '../job_message_icon';
import { useIsServerless } from '../../contexts/kibana';

interface JobMessagesProps {
  messages: JobMessage[];
  loading: boolean;
  error: string;
  refreshMessage?: () => Promise<void>;
  actionHandler?: (message: JobMessage) => void;
}

/**
 * Component for rendering job messages for anomaly detection
 * and data frame analytics jobs.
 */
export const JobMessages: FC<JobMessagesProps> = ({
  messages,
  loading,
  error,
  refreshMessage,
  actionHandler,
}) => {
  const isServerless = useIsServerless();
  const columns: Array<EuiBasicTableColumn<JobMessage>> = useMemo(() => {
    const cols = [
      {
        name: refreshMessage ? (
          <EuiToolTip
            content={i18n.translate('xpack.ml.jobMessages.refreshLabel', {
              defaultMessage: 'Refresh',
            })}
          >
            <EuiButtonIcon
              onClick={blurButtonOnClick(() => {
                refreshMessage();
              })}
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
        field: 'message',
        name: i18n.translate('xpack.ml.jobMessages.messageLabel', {
          defaultMessage: 'Message',
        }),
        width: '50%',
      },
    ];

    if (isServerless === false) {
      cols.splice(2, 0, {
        field: 'node_name',
        name: i18n.translate('xpack.ml.jobMessages.nodeLabel', {
          defaultMessage: 'Node',
        }),
        width: '150px',
      });
    }

    return cols;
  }, [isServerless, refreshMessage]);

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
      direction: 'desc' as const,
    },
  };

  return (
    <>
      <EuiSpacer size="s" />
      <EuiInMemoryTable
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
