/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ml } from '../../../../services/ml_api_service';
import { JobMessages } from '../../../../components/job_messages';
import { JobMessage } from '../../../../../../common/types/audit_message';
import { extractErrorMessage } from '../../../../../../common/util/errors';
import { useToastNotificationService } from '../../../../services/toast_notification_service';
import { useMlApiContext } from '../../../../contexts/kibana';
import { checkPermission } from '../../../../capabilities/check_capabilities';
interface JobMessagesPaneProps {
  jobId: string;
  showClearButton?: boolean;
  start?: string;
  end?: string;
  actionHandler?: (message: JobMessage) => void;
  refreshJobList?: () => void;
}

export const JobMessagesPane: FC<JobMessagesPaneProps> = React.memo(
  ({ jobId, start, end, actionHandler, refreshJobList, showClearButton }) => {
    const canCreateJob = checkPermission('canCreateJob');

    const [messages, setMessages] = useState<JobMessage[]>([]);
    const [notificationIndices, setNotificationIndices] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isClearing, setIsClearing] = useState<boolean>(false);

    const toastNotificationService = useToastNotificationService();
    const {
      jobs: { clearJobAuditMessages },
    } = useMlApiContext();

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const messagesResp = await ml.jobs.jobAuditMessages({ jobId, start, end });

        setMessages(messagesResp.messages);
        setNotificationIndices(messagesResp.notificationIndices);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        toastNotificationService.displayErrorToast(
          error,
          i18n.translate('xpack.ml.jobService.jobAuditMessagesErrorTitle', {
            defaultMessage: 'Error loading job messages',
          })
        );

        setErrorMessage(extractErrorMessage(error));
      }
    };

    const refreshMessage = useCallback(fetchMessages, [jobId]);

    // Clear messages for last 24hrs and refresh jobs list
    const clearMessages = useCallback(async () => {
      setIsClearing(true);
      try {
        await clearJobAuditMessages(jobId, notificationIndices);
        setIsClearing(false);
        if (typeof refreshJobList === 'function') {
          refreshJobList();
        }
      } catch (e) {
        setIsClearing(false);
        toastNotificationService.displayErrorToast(
          e,
          i18n.translate('xpack.ml.jobMessages.clearJobAuditMessagesErrorTitle', {
            defaultMessage: 'Error clearing job message warnings and errors',
          })
        );
      }
    }, [jobId, JSON.stringify(notificationIndices)]);

    useEffect(() => {
      fetchMessages();
    }, []);

    const disabled = notificationIndices.length === 0;

    const clearButton = (
      <EuiButton
        size="s"
        isLoading={isClearing}
        isDisabled={disabled}
        onClick={clearMessages}
        data-test-subj="mlJobMessagesClearButton"
      >
        <FormattedMessage
          id="xpack.ml.jobMessages.clearMessagesLabel"
          defaultMessage="Clear notifications"
        />
      </EuiButton>
    );

    return (
      <>
        {canCreateJob && showClearButton ? <EuiSpacer /> : null}
        <EuiFlexGroup direction="column">
          {canCreateJob && showClearButton ? (
            <EuiFlexItem grow={false}>
              <div>
                {disabled === true ? (
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.ml.jobMessages.clearJobAuditMessagesDisabledTooltip',
                      {
                        defaultMessage: 'Notification clearing not supported.',
                      }
                    )}
                  >
                    {clearButton}
                  </EuiToolTip>
                ) : (
                  <EuiToolTip
                    content={i18n.translate('xpack.ml.jobMessages.clearJobAuditMessagesTooltip', {
                      defaultMessage:
                        'Clears warning icon from jobs list for messages produced in the last 24 hours.',
                    })}
                  >
                    {clearButton}
                  </EuiToolTip>
                )}
              </div>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <JobMessages
              refreshMessage={refreshMessage}
              messages={messages}
              loading={isLoading}
              error={errorMessage}
              actionHandler={actionHandler}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);
