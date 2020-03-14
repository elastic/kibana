/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { Job, Props as ListingProps } from '../report_listing';

type DeleteFn = () => Promise<void>;
type Props = { jobsToDelete: Job[]; performDelete: DeleteFn } & ListingProps;

export const ReportDeleteButton: FunctionComponent<Props> = (props: Props) => {
  const { jobsToDelete, performDelete, intl } = props;

  if (jobsToDelete.length === 0) return null;

  const message =
    jobsToDelete.length > 1
      ? intl.formatMessage(
          {
            id: 'xpack.reporting.listing.table.deleteReportButton',
            defaultMessage: `Delete {num} reports`,
          },
          { num: jobsToDelete.length }
        )
      : intl.formatMessage({
          id: 'xpack.reporting.listing.table.deleteReportButton',
          defaultMessage: `Delete report`,
        });

  return (
    <EuiButton onClick={performDelete} iconType="trash" color={'danger'}>
      {message}
    </EuiButton>
  );
};
