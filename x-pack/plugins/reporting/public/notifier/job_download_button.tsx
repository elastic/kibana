/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { JobId, JobSummary } from '../../common/types';

interface Props {
  core: CoreStart;
  getUrl: (jobId: JobId) => string;
  job: JobSummary;
}

export const DownloadButton = ({ getUrl, job, core }: Props) => {
  return (
    <EuiButton
      size="s"
      data-test-subj="downloadCompletedReportButton"
      onClick={() => {
        core.http.fetch(getUrl(job.id), {
          headers: {
            [ELASTIC_HTTP_VERSION_HEADER]: '1',
            [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
          },
        });
      }}
      target="_blank"
    >
      <FormattedMessage
        id="xpack.reporting.publicNotifier.downloadReportButtonLabel"
        defaultMessage="Download report"
      />
    </EuiButton>
  );
};
