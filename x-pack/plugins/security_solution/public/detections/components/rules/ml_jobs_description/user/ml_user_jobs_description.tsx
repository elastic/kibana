/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import { matchJobId } from '../../../../../common/components/ml/anomaly/helpers';
import * as i18n from '../translations';
import { useInstalledSecurityJobs } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';

import { MlUserJobDescription } from './ml_user_job_description';

interface MlUserJobsDescriptionProps {
  jobIds: string[];
  readOnly: boolean;
}

const MlUserJobsDescriptionComponent: FC<MlUserJobsDescriptionProps> = ({ jobIds, readOnly }) => {
  const spaceId = useSpaceId();
  const { isMlUser, jobs, loading } = useInstalledSecurityJobs();

  if (!isMlUser || loading) {
    return null;
  }

  if (loading) {
    return <EuiLoadingSpinner size="m" />;
  }

  const relevantJobs = jobIds.map((jobId) => ({
    job: jobs.find((job) => matchJobId(job.id, jobId, spaceId)),
    jobId,
  }));

  return (
    <>
      {relevantJobs.map(({ job, jobId }) =>
        job ? (
          <MlUserJobDescription key={job.id} job={job} readOnly={readOnly} />
        ) : (
          <span>{i18n.JOB_NOT_FOUND}</span>
        )
      )}
    </>
  );
};

export const MlUserJobsDescription = memo(MlUserJobsDescriptionComponent);
