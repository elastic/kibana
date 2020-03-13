/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { JobStatuses } from '../../../constants';
import { Job as ListingJob, Props as ListingProps } from '../report_listing';

const { COMPLETED, FAILED } = JobStatuses;
type DeleteHandler = () => Promise<void>;

export const ReportDeleteButton = ({
  record,
  handleDelete,
  ...props
}: { record: ListingJob; handleDelete: DeleteHandler } & ListingProps) => {
  if (!([COMPLETED, FAILED] as string[]).includes(record.status)) {
    return null;
  }

  const { intl } = props;
  const button = (
    <EuiButtonIcon
      onClick={handleDelete}
      iconType="trash"
      color={'danger'}
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
