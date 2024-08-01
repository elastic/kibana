/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expanded_row_messages_pane.scss';

import type { FC } from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useMlApiContext } from '../../../../../contexts/kibana';
import { useRefreshAnalyticsList } from '../../../../common';
import { JobMessages } from '../../../../../components/job_messages';
import type { JobMessage } from '../../../../../../../common/types/audit_message';
import { useToastNotificationService } from '../../../../../services/toast_notification_service';

interface Props {
  analyticsId: string;
  dataTestSubj: string;
}

export const ExpandedRowMessagesPane: FC<Props> = ({ analyticsId, dataTestSubj }) => {
  const ml = useMlApiContext();
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const toastNotificationService = useToastNotificationService();

  const getMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const messagesResp = await ml.dataFrameAnalytics.getAnalyticsAuditMessages(analyticsId);
      setIsLoading(false);
      setMessages(messagesResp);
    } catch (error) {
      setIsLoading(false);
      toastNotificationService.displayErrorToast(
        error,
        i18n.translate(
          'xpack.ml.dfAnalyticsList.analyticsDetails.messagesPane.errorToastMessageTitle',
          {
            defaultMessage: 'Error loading job messages',
          }
        )
      );

      setErrorMessage(
        i18n.translate('xpack.ml.dfAnalyticsList.analyticsDetails.messagesPane.errorMessage', {
          defaultMessage: 'Messages could not be loaded',
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRefreshAnalyticsList({ onRefresh: getMessages });

  return (
    <div className="mlExpandedRowJobMessages" data-test-subj={dataTestSubj}>
      <JobMessages
        messages={messages}
        loading={isLoading}
        error={errorMessage}
        refreshMessage={getMessages}
      />
    </div>
  );
};
