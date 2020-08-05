/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
import { DatasetFilter } from '../../../../common/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { useModuleStatus } from './log_analysis_module_status';
import { ModuleDescriptor, ModuleSourceConfiguration } from './log_analysis_module_types';

export const useLogAnalysisModule = <JobType extends string>({
  sourceConfiguration,
  moduleDescriptor,
}: {
  sourceConfiguration: ModuleSourceConfiguration;
  moduleDescriptor: ModuleDescriptor<JobType>;
}) => {
  const { spaceId, sourceId, timestampField } = sourceConfiguration;
  const [moduleStatus, dispatchModuleStatus] = useModuleStatus(moduleDescriptor.jobTypes);

  const [, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        dispatchModuleStatus({ type: 'fetchingJobStatuses' });
        return await moduleDescriptor.getJobSummary(spaceId, sourceId);
      },
      onResolve: (jobResponse) => {
        dispatchModuleStatus({
          type: 'fetchedJobStatuses',
          payload: jobResponse,
          spaceId,
          sourceId,
        });
      },
      onReject: () => {
        dispatchModuleStatus({ type: 'failedFetchingJobStatuses' });
      },
    },
    [spaceId, sourceId]
  );

  const [, setUpModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (
        selectedIndices: string[],
        start: number | undefined,
        end: number | undefined,
        datasetFilter: DatasetFilter
      ) => {
        dispatchModuleStatus({ type: 'startedSetup' });
        const setupResult = await moduleDescriptor.setUpModule(start, end, datasetFilter, {
          indices: selectedIndices,
          sourceId,
          spaceId,
          timestampField,
        });
        const jobSummaries = await moduleDescriptor.getJobSummary(spaceId, sourceId);
        return { setupResult, jobSummaries };
      },
      onResolve: ({ setupResult: { datafeeds, jobs }, jobSummaries }) => {
        dispatchModuleStatus({
          type: 'finishedSetup',
          datafeedSetupResults: datafeeds,
          jobSetupResults: jobs,
          jobSummaries,
          spaceId,
          sourceId,
        });
      },
      onReject: () => {
        dispatchModuleStatus({ type: 'failedSetup' });
      },
    },
    [moduleDescriptor.setUpModule, spaceId, sourceId, timestampField]
  );

  const [cleanUpModuleRequest, cleanUpModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await moduleDescriptor.cleanUpModule(spaceId, sourceId);
      },
    },
    [spaceId, sourceId]
  );

  const isCleaningUp = useMemo(() => cleanUpModuleRequest.state === 'pending', [
    cleanUpModuleRequest.state,
  ]);

  const cleanUpAndSetUpModule = useCallback(
    (
      selectedIndices: string[],
      start: number | undefined,
      end: number | undefined,
      datasetFilter: DatasetFilter
    ) => {
      dispatchModuleStatus({ type: 'startedSetup' });
      cleanUpModule()
        .then(() => {
          setUpModule(selectedIndices, start, end, datasetFilter);
        })
        .catch(() => {
          dispatchModuleStatus({ type: 'failedSetup' });
        });
    },
    [cleanUpModule, dispatchModuleStatus, setUpModule]
  );

  const viewResults = useCallback(() => {
    dispatchModuleStatus({ type: 'viewedResults' });
  }, [dispatchModuleStatus]);

  const jobIds = useMemo(() => moduleDescriptor.getJobIds(spaceId, sourceId), [
    moduleDescriptor,
    spaceId,
    sourceId,
  ]);

  return {
    cleanUpAndSetUpModule,
    cleanUpModule,
    fetchJobStatus,
    isCleaningUp,
    jobIds,
    jobStatus: moduleStatus.jobStatus,
    jobSummaries: moduleStatus.jobSummaries,
    lastSetupErrorMessages: moduleStatus.lastSetupErrorMessages,
    moduleDescriptor,
    setUpModule,
    setupStatus: moduleStatus.setupStatus,
    sourceConfiguration,
    viewResults,
  };
};
