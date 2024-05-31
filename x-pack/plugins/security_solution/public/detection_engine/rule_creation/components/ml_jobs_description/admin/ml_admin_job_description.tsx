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

interface MlAdminJobDescriptionProps {
  job: SecurityJob;
  loading: boolean;
  refreshJob: (job: SecurityJob) => void;
}

const MlAdminJobDescriptionComponent: FC<MlAdminJobDescriptionProps> = ({
  job,
  loading,
  refreshJob,
}) => {
  const {
    enableDatafeed,
    disableDatafeed,
    isLoading: isLoadingEnableDataFeed,
  } = useEnableDataFeed();

  const handleJobStateChange = useCallback(
    async (_, latestTimestampMs: number, enable: boolean) => {
      if (enable) {
        await enableDatafeed(job, latestTimestampMs);
      } else {
        await disableDatafeed(job);
      }

      refreshJob(job);
    },
    [enableDatafeed, disableDatafeed, job, refreshJob]
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

  return <MlJobItem job={job} switchComponent={switchComponent} />;
};

export const MlAdminJobDescription = memo(MlAdminJobDescriptionComponent);
