/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { JobId, JobSummary } from '../../index.d';

interface Props {
  getUrl: (jobId: JobId) => string;
  job: JobSummary;
}

export const DownloadButton = ({ getUrl, job }: Props) => {
  const downloadReport = () => {
    window.open(getUrl(job.id));
  };

  return (
    <EuiButton
      size="s"
      data-test-subj="downloadCompletedReportButton"
      onClick={() => {
        downloadReport();
      }}
    >
      <FormattedMessage
        id="xpack.reporting.publicNotifier.downloadReportButtonLabel"
        defaultMessage="Download report"
      />
    </EuiButton>
  );
};
