/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, memo } from 'react';

import { useEnableDataFeed } from '../../../../../common/components/ml_popover/hooks/use_enable_data_feed';
import type { SecurityJob } from '../../../../../common/components/ml_popover/types';
import { JobSwitch } from '../../../../../common/components/ml_popover/jobs_table/job_switch';

import { MlJobItem } from '../ml_job_item';
import type { UpdateMachineLearningJob } from './ml_admin_jobs_description';

interface MlAdminJobDescriptionProps {
  job: SecurityJob;
  ruleJobId: string;
  loading: boolean;
  refreshJob: (job: SecurityJob) => void;
  readOnly: boolean;
  onUpdateJobId?: UpdateMachineLearningJob;
}

const MlAdminJobDescriptionComponent: FC<MlAdminJobDescriptionProps> = ({
  job,
  ruleJobId,
  loading,
  refreshJob,
  readOnly,
  onUpdateJobId,
}) => {
  const { enableDatafeed, isLoading: isLoadingEnableDataFeed } = useEnableDataFeed();

  const handleJobStateChange = useCallback(
    async (_, latestTimestampMs: number, enable: boolean) => {
      const { enabledJobId } = await enableDatafeed(job, latestTimestampMs, enable);

      /**
       * There are 2 circumstances where enabledJobId is different than ruleJobId
       * 1. When the job gets installed (it receives the space prefix)
       * 2. When the job is installed but the rule has a reference to the module id (without prefix)
       */
      if (onUpdateJobId && enabledJobId !== ruleJobId) {
        await onUpdateJobId(ruleJobId, enabledJobId);
      }

      refreshJob(job);
    },
    [enableDatafeed, job, ruleJobId, onUpdateJobId, refreshJob]
  );

  const switchComponent = useMemo(
    () => (
      <JobSwitch
        job={job}
        isSecurityJobsLoading={loading || isLoadingEnableDataFeed}
        onJobStateChange={handleJobStateChange}
      />
    ),
    [handleJobStateChange, isLoadingEnableDataFeed, job, loading]
  );

  return <MlJobItem job={job} switchComponent={readOnly ? undefined : switchComponent} />;
};

export const MlAdminJobDescription = memo(MlAdminJobDescriptionComponent);
