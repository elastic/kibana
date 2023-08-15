/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import fileSaver from 'file-saver';
import React from 'react';
import { INTERNAL_ROUTES } from '../../common/constants';
import { JobSummary } from '../../common/types';

interface Props {
  http: Pick<CoreStart['http'], 'fetch'>;
  job: JobSummary;
  getUrl?: (jobId: string) => string;
}

export const DownloadButton = ({ http, job }: Props) => {
  return (
    <EuiButton
      size="s"
      data-test-subj="downloadCompletedReportButton"
      onClick={() =>
        http
          .fetch(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/${job.id}`, { version: '1' })
          .then((resp) => {
            const csvBlob = new Blob([resp as string], { type: 'text/csv' });
            fileSaver.saveAs(csvBlob, `${job.title}.csv`);
            return;
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
