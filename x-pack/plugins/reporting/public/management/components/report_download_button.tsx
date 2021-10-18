/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonProps } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { Job as ListingJob } from '../../lib/job';
import { useInternalApiClient } from '../../lib/reporting_api_client';

const i18nTexts = {
  buttonAriaLabel: i18n.translate('xpack.reporting.listing.table.downloadReportAriaLabel', {
    defaultMessage: 'Download report',
  }),
  buttonLabel: i18n.translate('xpack.reporting.listing.table.downloadReportButtonLabel', {
    defaultMessage: 'Download report',
  }),
};

interface Props extends EuiButtonProps {
  job: ListingJob;
  disabled: boolean;
}

export const ReportDownloadButton: FunctionComponent<Props> = ({ job, disabled, ...rest }) => {
  const { apiClient } = useInternalApiClient();
  return (
    <EuiButton
      {...rest}
      disabled={disabled}
      iconType="download"
      onClick={() => {
        apiClient.downloadReport(job.id);
      }}
      size="s"
      aria-label={i18nTexts.buttonAriaLabel}
    >
      {i18nTexts.buttonLabel}
    </EuiButton>
  );
};
