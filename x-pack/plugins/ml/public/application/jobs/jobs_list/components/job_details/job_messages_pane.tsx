/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';

import { ml } from '../../../../services/ml_api_service';
import { JobMessages } from '../../../../components/job_messages';
import { JobMessage } from '../../../../../../common/types/audit_message';

interface JobMessagesPaneProps {
  jobId: string;
}

export const JobMessagesPane: FC<JobMessagesPaneProps> = ({ jobId }) => {
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      setMessages(await ml.jobs.jobAuditMessages(jobId));
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      setErrorMessage(e);
      // eslint-disable-next-line no-console
      console.error('Job messages could not be loaded', e);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return <JobMessages messages={messages} loading={isLoading} error={errorMessage} />;
};
