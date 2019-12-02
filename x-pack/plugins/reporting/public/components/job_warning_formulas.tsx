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

export const getWarningFormulasToast = (
  job: JobSummary,
  getReportLink: () => string,
  getDownloadLink: (jobId: JobId) => string
): ToastInput => ({
  title: toMountPoint(
    <FormattedMessage
      id="xpack.reporting.publicNotifier.csvContainsFormulas.formulaReportTitle"
      defaultMessage="Report may contain formulas {reportObjectType} '{reportObjectTitle}'"
      values={{ reportObjectType: job.type, reportObjectTitle: job.title }}
    />
  ),
  text: toMountPoint(
    <Fragment>
      <p>
        <FormattedMessage
          id="xpack.reporting.publicNotifier.csvContainsFormulas.formulaReportMessage"
          defaultMessage="The report contains characters which spreadsheet applications can interpret as formulas."
        />
      </p>
      <p>
        <ReportLink getUrl={getReportLink} />
      </p>
      <DownloadButton getUrl={getDownloadLink} job={job} />
    </Fragment>
  ),
  'data-test-subj': 'completeReportCsvFormulasWarning',
});
