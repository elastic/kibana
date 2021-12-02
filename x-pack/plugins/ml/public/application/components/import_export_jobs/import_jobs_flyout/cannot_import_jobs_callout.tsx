/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut, EuiText, EuiAccordion, EuiSpacer } from '@elastic/eui';
import type { SkippedJobs } from './jobs_import_service';

interface Props {
  jobs: SkippedJobs[];
  autoExpand?: boolean;
}

export const CannotImportJobsCallout: FC<Props> = ({ jobs, autoExpand = false }) => {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.ml.importExport.importFlyout.cannotImportJobCallout.title', {
          defaultMessage: '{num, plural, one {# job} other {# jobs}} cannot be imported',
          values: { num: jobs.length },
        })}
        color="warning"
        data-test-subj="mlJobMgmtImportJobsCannotBeImportedCallout"
      >
        {autoExpand ? (
          <SkippedJobList jobs={jobs} />
        ) : (
          <EuiAccordion
            id="advancedOptions"
            paddingSize="s"
            aria-label={i18n.translate(
              'xpack.ml.importExport.importFlyout.cannotImportJobCallout.jobListAria',
              {
                defaultMessage: 'view jobs',
              }
            )}
            buttonContent={
              <FormattedMessage
                id="xpack.ml.importExport.importFlyout.cannotImportJobCallout.jobListButton"
                defaultMessage="View jobs"
              />
            }
          >
            <SkippedJobList jobs={jobs} />
          </EuiAccordion>
        )}
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  );
};

const SkippedJobList: FC<{ jobs: SkippedJobs[] }> = ({ jobs }) => (
  <>
    {jobs.length > 0 && (
      <>
        {jobs.map(({ jobId, missingIndices, missingFilters }) => (
          <EuiText size="s">
            <h5>{jobId}</h5>
            {missingIndices.length > 0 && (
              <FormattedMessage
                id="xpack.ml.importExport.importFlyout.cannotImportJobCallout.missingIndex"
                defaultMessage="Missing index {num, plural, one {pattern} other {patterns}}: {indices}"
                values={{ num: missingIndices.length, indices: missingIndices.join(',') }}
              />
            )}
            {missingFilters.length > 0 && (
              <FormattedMessage
                id="xpack.ml.importExport.importFlyout.cannotImportJobCallout.missingFilters"
                defaultMessage="Missing filter {num, plural, one {list} other {lists}}: {filters}"
                values={{ num: missingFilters.length, filters: missingFilters.join(',') }}
              />
            )}
          </EuiText>
        ))}
      </>
    )}
  </>
);
