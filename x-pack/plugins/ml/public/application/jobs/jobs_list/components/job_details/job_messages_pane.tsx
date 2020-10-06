/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ml } from '../../../../services/ml_api_service';
import { JobMessages } from '../../../../components/job_messages';
import { JobMessage } from '../../../../../../common/types/audit_message';
import { extractErrorMessage } from '../../../../../../common/util/errors';
import { toastNotificationServiceProvider } from '../../../../services/toast_notification_service';
import { useMlKibana } from '../../../../contexts/kibana';
interface JobMessagesPaneProps {
  jobId: string;
}

export const JobMessagesPane: FC<JobMessagesPaneProps> = ({ jobId }) => {
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const {
    services: {
      notifications: { toasts },
    },
  } = useMlKibana();

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      setMessages(await ml.jobs.jobAuditMessages(jobId));
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      const toastNotificationService = toastNotificationServiceProvider(toasts);
      toastNotificationService.displayErrorToast(
        error,
        i18n.translate('xpack.ml.jobService.jobAuditMessagesErrorTitle', {
          defaultMessage: 'Job Audit Messages Error',
        })
      );

      setErrorMessage(extractErrorMessage(error));
    }
  };

  const refreshMessage = useCallback(fetchMessages, [jobId]);

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <JobMessages
      refreshMessage={refreshMessage}
      messages={messages}
      loading={isLoading}
      error={errorMessage}
    />
  );
};
