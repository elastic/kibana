/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ml } from '../../../../../services/ml_api_service';
import { useRefreshAnalyticsList } from '../../../../common';
import { JobMessages } from '../../../../../components/job_messages';
import { JobMessage } from '../../../../../../../common/types/audit_message';

interface Props {
  analyticsId: string;
}

export const ExpandedRowMessagesPane: FC<Props> = ({ analyticsId }) => {
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getMessagesFactory = () => {
    let concurrentLoads = 0;
    return async function getMessages() {
      try {
        concurrentLoads++;

        if (concurrentLoads > 1) {
          return;
        }

        setIsLoading(true);
        const messagesResp = await ml.dataFrameAnalytics.getAnalyticsAuditMessages(analyticsId);
        setIsLoading(false);
        setMessages(messagesResp);

        concurrentLoads--;

        if (concurrentLoads > 0) {
          concurrentLoads = 0;
          getMessages();
        }
      } catch (error) {
        setIsLoading(false);
        setErrorMessage(
          i18n.translate('xpack.ml.dfAnalyticsList.analyticsDetails.messagesPane.errorMessage', {
            defaultMessage: 'Messages could not be loaded',
          })
        );
      }
    };
  };
  useRefreshAnalyticsList({ onRefresh: getMessagesFactory() });

  return (
    <JobMessages
      messages={messages}
      loading={isLoading}
      error={errorMessage}
      refreshMessage={getMessagesFactory()}
    />
  );
};
