/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { ThemeServiceStart, ToastInput } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { JobId, JobSummary } from '../../common/types';
import { DownloadButton } from './job_download_button';
import { ReportLink } from './report_link';

export const getWarningToast = (
  job: JobSummary,
  getReportLink: () => string,
  getDownloadLink: (jobId: JobId) => string,
  theme: ThemeServiceStart
): ToastInput => ({
  title: toMountPoint(
    <FormattedMessage
      id="xpack.reporting.publicNotifier.warning.title"
      defaultMessage="{reportType} completed with issues"
      values={{ reportType: job.jobtype }}
    />,
    { theme$: theme.theme$ }
  ),
  text: toMountPoint(
    <>
      <p>
        <ReportLink getUrl={getReportLink} />
      </p>
      <DownloadButton getUrl={getDownloadLink} job={job} />
    </>,
    { theme$: theme.theme$ }
  ),
  'data-test-subj': 'completeReportWarning',
});
