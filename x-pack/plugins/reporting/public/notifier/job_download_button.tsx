/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM } from '@kbn/core-http-common';
import React from 'react';
import { JobId, JobSummary } from '../../common/types';

interface Props {
  job: JobSummary;
  getUrl: (jobId: JobId) => string;
}

export const DownloadButton = ({ getUrl, job }: Props) => {
  return (
    <EuiButton
      size="s"
      data-test-subj="downloadCompletedReportButton"
      href={getUrl(`${job.id}?${ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM}`)}
      target="_blank"
    >
      <FormattedMessage
        id="xpack.reporting.publicNotifier.downloadReportButtonLabel"
        defaultMessage="Download report"
      />
    </EuiButton>
  );
};
