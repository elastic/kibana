/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { JOB_STATUSES } from '../../../common/constants';
import { Job as ListingJob, Props as ListingProps } from '../report_listing';

type Props = { record: ListingJob } & ListingProps;

export const ReportDownloadButton: FunctionComponent<Props> = (props: Props) => {
  const { record, apiClient, intl } = props;

  if (record.status !== JOB_STATUSES.COMPLETED && record.status !== JOB_STATUSES.WARNINGS) {
    return null;
  }

  const button = (
    <EuiButtonIcon
      onClick={() => apiClient.downloadReport(record.id)}
      iconType="importAction"
      aria-label={intl.formatMessage({
        id: 'xpack.reporting.listing.table.downloadReportAriaLabel',
        defaultMessage: 'Download report',
      })}
    />
  );

  if (record.csv_contains_formulas) {
    return (
      <EuiToolTip
        position="top"
        content={intl.formatMessage({
          id: 'xpack.reporting.listing.table.csvContainsFormulas',
          defaultMessage:
            'Your CSV contains characters which spreadsheet applications can interpret as formulas.',
        })}
      >
        {button}
      </EuiToolTip>
    );
  }

  if (record.max_size_reached) {
    return (
      <EuiToolTip
        position="top"
        content={intl.formatMessage({
          id: 'xpack.reporting.listing.table.maxSizeReachedTooltip',
          defaultMessage: 'Max size reached, contains partial data.',
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
