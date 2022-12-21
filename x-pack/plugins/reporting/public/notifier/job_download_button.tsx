/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { JobId, JobSummary } from '../../common/types';

interface Props {
  getUrl: (jobId: JobId) => string;
  job: JobSummary;
}

export const DownloadButton = ({ getUrl, job }: Props) => {
  return (
    <EuiButton
      size="s"
      data-test-subj="downloadCompletedReportButton"
      href={getUrl(job.id)}
      target="_blank"
    >
      <FormattedMessage
        id="xpack.reporting.publicNotifier.downloadReportButtonLabel"
        defaultMessage="Download report"
      />
    </EuiButton>
  );
};
