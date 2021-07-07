/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';

export interface SkippedJobs {
  jobId: string;
  missingIndices: string[];
}

export const CannotImportJobsCallout: FC<{ jobs: SkippedJobs[] }> = ({ jobs }) => {
  if (jobs.length === 0) {
    return null;
  }
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={i18n.translate('xpack.ml.dataGrid.IndexNoDataCalloutTitle', {
          defaultMessage: '{num, plural, one {# job} other {# jobs}} cannot be imported',
          values: { num: jobs.length },
        })}
        color="warning"
      >
        {jobs.length > 0 && (
          <>
            {jobs.map(({ jobId, missingIndices }) => (
              <>
                <EuiText size="s">
                  <h5>{jobId}</h5>
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.closeButton"
                    defaultMessage="Missing index {num, plural, one {pattern} other {patterns}}: {indices}"
                    values={{ num: missingIndices.length, indices: missingIndices.join(',') }}
                  />
                </EuiText>
                <EuiSpacer size="s" />
              </>
            ))}
          </>
        )}
      </EuiCallOut>
    </>
  );
};
