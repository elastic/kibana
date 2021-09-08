/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n/react';
import React, { FunctionComponent } from 'react';
import { JOB_STATUSES } from '../../common/constants';
import { Job as ListingJob } from '../lib/job';
import { ReportingAPIClient } from '../lib/reporting_api_client';

interface Props {
  intl: InjectedIntl;
  apiClient: ReportingAPIClient;
  job: ListingJob;
}

export const ReportDownloadButton: FunctionComponent<Props> = (props: Props) => {
  const { job, apiClient, intl } = props;

  if (job.status !== JOB_STATUSES.COMPLETED && job.status !== JOB_STATUSES.WARNINGS) {
    return null;
  }

  const button = (
    <EuiButtonIcon
      onClick={() => apiClient.downloadReport(job.id)}
      iconType="importAction"
      aria-label={intl.formatMessage({
        id: 'xpack.reporting.listing.table.downloadReportAriaLabel',
        defaultMessage: 'Download report',
      })}
    />
  );

  const warnings = job.getWarnings();
  if (warnings) {
    return (
      <EuiToolTip
        position="top"
        content={intl.formatMessage({
          id: 'xpack.reporting.listing.table.downloadReportWithWarnings',
          defaultMessage: 'Download report with warnings',
        })}
      >
        {button}
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip
      position="top"
      content={intl.formatMessage({
        id: 'xpack.reporting.listing.table.downloadReport',
        defaultMessage: 'Download report',
      })}
    >
      {button}
    </EuiToolTip>
  );
};
