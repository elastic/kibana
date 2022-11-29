/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';

import { useInstalledSecurityJobs } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';

import { MlUserJobDescription } from './ml_user_job_description';

interface MlUserJobsDescriptionProps {
  jobIds: string[];
}

const MlUserJobsDescriptionComponent: FC<MlUserJobsDescriptionProps> = ({ jobIds }) => {
  const { isMlUser, jobs } = useInstalledSecurityJobs();

  if (!isMlUser) {
    return null;
  }

  const relevantJobs = jobs.filter((job) => jobIds.includes(job.id));

  return (
    <>
      {relevantJobs.map((job) => (
        <MlUserJobDescription key={job.id} job={job} />
      ))}
    </>
  );
};

export const MlUserJobsDescription = memo(MlUserJobsDescriptionComponent);
