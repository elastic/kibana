/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { MlSummaryJob } from '../../../../../../common/types/anomaly_detection_jobs';
import { JOB_STATE } from '../../../../../../common/constants/states';

interface Props {
  jobs: MlSummaryJob[];
}

export const OpenJobsWarningCallout: FC<Props> = ({ jobs }) => {
  const openJobsCount = useMemo(
    () => jobs.filter((j) => j.jobState !== JOB_STATE.CLOSED).length,
    [jobs]
  );

  if (openJobsCount === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.jobsList.resetJobModal.openJobsWarningCallout.title"
            defaultMessage="{openJobsCount, plural, one {# job is} other {# jobs are}} not closed"
            values={{ openJobsCount }}
          />
        }
        color="warning"
      >
        <FormattedMessage
          id="xpack.ml.jobsList.resetJobModal.openJobsWarningCallout.description1"
          defaultMessage="{openJobsCount, plural, one {This job} other {These jobs}} must be closed before {openJobsCount, plural, one {it} other {they}} can be reset. "
          values={{ openJobsCount }}
        />
        <br />
        <FormattedMessage
          id="xpack.ml.jobsList.resetJobModal.openJobsWarningCallout.description2"
          defaultMessage="{openJobsCount, plural, one {This job} other {These jobs}} will not be reset when clicking the Reset button below."
          values={{ openJobsCount }}
        />
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  );
};
