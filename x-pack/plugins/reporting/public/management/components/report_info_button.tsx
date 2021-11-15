/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { Job } from '../../lib/job';

interface Props {
  job: Job;
  onClick: () => void;
}

export const ReportInfoButton: FunctionComponent<Props> = ({ job, onClick }) => {
  let message = i18n.translate('xpack.reporting.listing.table.reportInfoButtonTooltip', {
    defaultMessage: 'See report info.',
  });
  if (job.getError()) {
    message = i18n.translate('xpack.reporting.listing.table.reportInfoAndErrorButtonTooltip', {
      defaultMessage: 'See report info and error message.',
    });
  } else if (job.getWarnings()) {
    message = i18n.translate('xpack.reporting.listing.table.reportInfoAndWarningsButtonTooltip', {
      defaultMessage: 'See report info and warnings.',
    });
  }

  const showReportInfoCopy = i18n.translate(
    'xpack.reporting.listing.table.showReportInfoAriaLabel',
    {
      defaultMessage: 'Show report info',
    }
  );

  return (
    <EuiToolTip position="top" content={message}>
      <EuiButtonEmpty
        onClick={onClick}
        iconType="iInCircle"
        color="primary"
        data-test-subj="reportInfoButton"
        aria-label={showReportInfoCopy}
      >
        {showReportInfoCopy}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};
