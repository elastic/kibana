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

export const getSuccessToast = (
  job: JobSummary,
  getReportLink: () => string,
  getDownloadLink: (jobId: JobId) => string,
  theme: ThemeServiceStart
): ToastInput => ({
  title: toMountPoint(
    <FormattedMessage
      id="xpack.reporting.publicNotifier.successfullyCreatedReportNotificationTitle"
      defaultMessage="{reportType} created for '{reportObjectTitle}'"
      values={{ reportType: job.jobtype, reportObjectTitle: job.title }}
    />,
    { theme$: theme.theme$ }
  ),
  color: 'success',
  text: toMountPoint(
    <>
      <p>
        <ReportLink getUrl={getReportLink} />
      </p>
      <DownloadButton getUrl={getDownloadLink} job={job} />
    </>,
    { theme$: theme.theme$ }
  ),
  /**
   * If timeout is an Infinity value, a Not-a-Number (NaN) value, or negative, then timeout will be zero.
   * And we cannot use `Number.MAX_SAFE_INTEGER` because EUI's Timer implementation
   * subtracts it from the current time to evaluate the remainder.
   * @see https://www.w3.org/TR/2011/WD-html5-20110525/timers.html
   */
  toastLifeTimeMs: Number.MAX_SAFE_INTEGER - Date.now(),
  'data-test-subj': 'completeReportSuccess',
});
