/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { isJobStarted } from '../../../../common/machine_learning/helpers';
import { useSecurityJobs } from '../../../common/components/ml_popover/hooks/use_security_jobs';
import { useEnableDataFeed } from '../../../common/components/ml_popover/hooks/use_enable_data_feed';

export interface ReturnUseStartMlJobs {
  startMlJobs: (jobIds: string[] | undefined) => Promise<void>;
}

export const useStartMlJobs = (): ReturnUseStartMlJobs => {
  const { enableDatafeed, isLoading: isLoadingEnableDataFeed } = useEnableDataFeed();
  const { loading: isLoadingJobs, jobs: mlJobs, refetch: refetchJobs } = useSecurityJobs();
  const startMlJobs = useCallback(
    async (jobIds: string[] | undefined) => {
      if (isLoadingJobs || isLoadingEnableDataFeed) {
        return;
      }

      if (!jobIds || !jobIds.length) {
        return;
      }

      const ruleJobs = mlJobs.filter((job) => jobIds.includes(job.id));
      await Promise.all(
        ruleJobs.map(async (job) => {
          if (isJobStarted(job.jobState, job.datafeedState)) {
            return true;
          }

          const latestTimestampMs = job.latestTimestampMs ?? 0;
          await enableDatafeed(job, latestTimestampMs, true);
        })
      );

      refetchJobs();
    },
    [enableDatafeed, isLoadingEnableDataFeed, isLoadingJobs, mlJobs, refetchJobs]
  );

  return { startMlJobs };
};
