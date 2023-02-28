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
import { useSecurityJobs } from '../../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';

import { MlAdminJobDescription } from './ml_admin_job_description';

// TODO MOVE IT TO TYPES
export type UpdateMachineLearningJob = (
  originalJobId: string,
  updatedJobId: string
) => Promise<void>;

interface MlAdminJobsDescriptionProps {
  jobIds: string[];
  updateMachineLearningJob?: UpdateMachineLearningJob;
}

const MlAdminJobsDescriptionComponent: FC<MlAdminJobsDescriptionProps> = ({
  jobIds,
  updateMachineLearningJob,
}) => {
  const spaceId = useSpaceId();
  const { loading, jobs, refetch: refreshJobs, isMlAdmin } = useSecurityJobs();

  if (!isMlAdmin) {
    return null;
  }

  if (loading) {
    return <EuiLoadingSpinner size="m" />;
  }

  const relevantJobs = jobIds.map((ruleJobId) => ({
    job: jobs.find((job) => matchJobId(job.id, ruleJobId, spaceId)),
    ruleJobId,
  }));

  return (
    <>
      {relevantJobs.map(({ job, ruleJobId }) =>
        job ? (
          <MlAdminJobDescription
            key={ruleJobId}
            job={job}
            ruleJobId={ruleJobId}
            loading={loading}
            refreshJob={refreshJobs}
            readOnly={!updateMachineLearningJob}
            onUpdateJobId={updateMachineLearningJob}
          />
        ) : (
          <span>{i18n.JOB_NOT_FOUND}</span>
        )
      )}
    </>
  );
};

export const MlAdminJobsDescription = memo(MlAdminJobsDescriptionComponent);
