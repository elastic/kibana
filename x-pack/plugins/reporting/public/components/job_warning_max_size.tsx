/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { ToastInput } from '../../../../../src/core/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { JobId, JobSummary } from '../../index.d';
import { ReportLink } from './report_link';
import { DownloadButton } from './download_button';

export const getWarningMaxSizeToast = (
  job: JobSummary,
  getReportLink: () => string,
  getDownloadLink: (jobId: JobId) => string
): ToastInput => ({
  title: toMountPoint(
    <FormattedMessage
      id="xpack.reporting.publicNotifier.maxSizeReached.partialReportTitle"
      defaultMessage="Created partial report for {reportObjectType} '{reportObjectTitle}'"
      values={{ reportObjectType: job.type, reportObjectTitle: job.title }}
    />
  ),
  text: toMountPoint(
    <Fragment>
      <p>
        <FormattedMessage
          id="xpack.reporting.publicNotifier.maxSizeReached.partialReportDescription"
          defaultMessage="The report reached the max size and contains partial data."
        />
      </p>
      <p>
        <ReportLink getUrl={getReportLink} />
      </p>
      <DownloadButton getUrl={getDownloadLink} job={job} />
    </Fragment>
  ),
  'data-test-subj': 'completeReportMaxSizeWarning',
});
