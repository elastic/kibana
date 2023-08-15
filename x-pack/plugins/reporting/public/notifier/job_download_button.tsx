/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { JobSummary } from '../../common/types';

interface Props {
  http: Pick<CoreStart['http'], 'fetch'>;
  job: JobSummary;
}

export const DownloadButton = ({ http, job }: Props) => {
  return (
    <EuiButton
      size="s"
      data-test-subj="downloadCompletedReportButton"
      onClick={() =>
        http.fetch(`/internal/reporting/jobs/download//${job.id}?apiVersion=1`, {
          headers: {
            [ELASTIC_HTTP_VERSION_HEADER]: '1',
            [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
          },
        })
      }
      target="_blank"
    >
      <FormattedMessage
        id="xpack.reporting.publicNotifier.downloadReportButtonLabel"
        defaultMessage="Download report"
      />
    </EuiButton>
  );
};
