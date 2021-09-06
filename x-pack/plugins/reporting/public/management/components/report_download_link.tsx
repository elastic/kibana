/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiLink, EuiToolTip } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { Job as ListingJob } from '../../lib/job';
import { useInternalApiClient } from '../../lib/reporting_api_client';

const i18nTexts = {
  linkAriaLabel: i18n.translate('xpack.reporting.listing.table.downloadReportAriaLabel', {
    defaultMessage: 'Download report',
  }),
  toolTipDownload: i18n.translate('xpack.reporting.listing.table.downloadReport', {
    defaultMessage: 'Download report',
  }),
  toolTipDownloadWithWarnings: i18n.translate(
    'xpack.reporting.listing.table.downloadReportWithWarnings',
    { defaultMessage: 'Download report with warnings' }
  ),
  noTitle: i18n.translate('xpack.reporting.listing.table.noTitleLabel', {
    defaultMessage: 'Untitled',
  }),
};

interface Props {
  objectTitle: string;
  job: ListingJob;
  disabled: boolean;
}

export const ReportDownloadLink: FunctionComponent<Props> = ({ objectTitle, job, disabled }) => {
  const { apiClient } = useInternalApiClient();

  const title = objectTitle || i18nTexts.noTitle;

  const link = (
    <EuiLink
      disabled={disabled}
      onClick={() => apiClient.downloadReport(job.id)}
      aria-label={i18nTexts.linkAriaLabel}
    >
      {title}
    </EuiLink>
  );

  const warnings = job.getWarnings();

  if (warnings) {
    return (
      <EuiToolTip position="top" content={i18nTexts.toolTipDownloadWithWarnings}>
        {link}
      </EuiToolTip>
    );
  } else if (disabled) {
    return link;
  }
  return (
    <EuiToolTip position="top" content={i18nTexts.toolTipDownload}>
      {link}
    </EuiToolTip>
  );
};
