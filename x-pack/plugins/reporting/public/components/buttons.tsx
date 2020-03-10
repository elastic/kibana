/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ReportErrorButton } from './report_error_button';
import { ReportInfoButton } from './report_info_button';
import { JobStatuses } from '../../constants';
import { Job as ListingJob, Props as ListingProps } from './report_listing';

const { COMPLETED, FAILED } = JobStatuses;

export const renderDownloadButton = (props: ListingProps, record: ListingJob) => {
  if (record.status !== COMPLETED) {
    return;
  }

  const { intl } = props;
  const button = (
    <EuiButtonIcon
      onClick={() => props.apiClient.downloadReport(record.id)}
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

// callback for updating the listing after delete response arrives
type DeleteHandler = () => Promise<void>;

export const renderDeleteButton = (
  props: ListingProps,
  handleDelete: DeleteHandler,
  record: ListingJob
) => {
  if (!([COMPLETED, FAILED] as string[]).includes(record.status)) {
    return;
  }

  const { intl } = props;
  const button = (
    <EuiButtonIcon
      onClick={handleDelete}
      iconType="trash"
      aria-label={intl.formatMessage({
        id: 'xpack.reporting.listing.table.deleteReportButton',
        defaultMessage: 'Delete report',
      })}
    />
  );
  return (
    <EuiToolTip
      position="top"
      content={intl.formatMessage({
        id: 'xpack.reporting.listing.table.deleteReportAriaLabel',
        defaultMessage: 'Delete report',
      })}
    >
      {button}
    </EuiToolTip>
  );
};

export const renderReportErrorButton = (props: ListingProps, record: ListingJob) => {
  if (record.status !== FAILED) {
    return;
  }

  return <ReportErrorButton apiClient={props.apiClient} jobId={record.id} />;
};

export const renderInfoButton = (props: ListingProps, record: ListingJob) => {
  const { intl } = props;
  return (
    <EuiToolTip
      position="top"
      content={intl.formatMessage({
        id: 'xpack.reporting.listing.table.infoButtonAriaLabel',
        defaultMessage: 'Download report',
      })}
    >
      <ReportInfoButton apiClient={props.apiClient} jobId={record.id} />
    </EuiToolTip>
  );
};
