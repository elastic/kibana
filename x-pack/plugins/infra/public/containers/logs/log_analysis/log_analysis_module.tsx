/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useUiTracker } from '@kbn/observability-plugin/public';
import { DatasetFilter } from '../../../../common/log_analysis';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
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
  const { services } = useKibanaContextForPlugin();
  const { spaceId, sourceId, timestampField, runtimeMappings } = sourceConfiguration;
  const [moduleStatus, dispatchModuleStatus] = useModuleStatus(moduleDescriptor.jobTypes);

  const trackMetric = useUiTracker({ app: 'infra_logs' });

  const [, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        dispatchModuleStatus({ type: 'fetchingJobStatuses' });
        return await moduleDescriptor.getJobSummary(spaceId, sourceId, services.http.fetch);
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
        const setupResult = await moduleDescriptor.setUpModule(
          start,
          end,
          datasetFilter,
          {
            indices: selectedIndices,
            sourceId,
            spaceId,
            timestampField,
            runtimeMappings,
          },
          services.http.fetch
        );
        const jobSummaries = await moduleDescriptor.getJobSummary(
          spaceId,
          sourceId,
          services.http.fetch
        );
        return { setupResult, jobSummaries };
      },
      onResolve: ({ setupResult: { datafeeds, jobs }, jobSummaries }) => {
        // Track failures
        if (
          [...datafeeds, ...jobs]
            .reduce<string[]>((acc, resource) => [...acc, ...Object.keys(resource)], [])
            .some((key) => key === 'error')
        ) {
          const reasons = [...datafeeds, ...jobs]
            .filter((resource) => resource.error !== undefined)
            .map((resource) => resource.error?.error?.reason ?? '');
          // NOTE: Lack of indices and a missing field mapping have the same error
          if (
            reasons.filter((reason) => reason.includes('because it has no mappings')).length > 0
          ) {
            trackMetric({ metric: 'logs_ml_setup_error_bad_indices_or_mappings' });
          } else {
            trackMetric({ metric: 'logs_ml_setup_error_unknown_cause' });
          }
        }

        dispatchModuleStatus({
          type: 'finishedSetup',
          datafeedSetupResults: datafeeds,
          jobSetupResults: jobs,
          jobSummaries,
          spaceId,
          sourceId,
        });
      },
      onReject: (e: any) => {
        dispatchModuleStatus({ type: 'failedSetup' });
        if (e?.body?.statusCode === 403) {
          trackMetric({ metric: 'logs_ml_setup_error_lack_of_privileges' });
        }
      },
    },
    [moduleDescriptor.setUpModule, spaceId, sourceId, timestampField]
  );

  const [cleanUpModuleRequest, cleanUpModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await moduleDescriptor.cleanUpModule(spaceId, sourceId, services.http.fetch);
      },
    },
    [spaceId, sourceId]
  );

  const isCleaningUp = useMemo(
    () => cleanUpModuleRequest.state === 'pending',
    [cleanUpModuleRequest.state]
  );

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

  const jobIds = useMemo(
    () => moduleDescriptor.getJobIds(spaceId, sourceId),
    [moduleDescriptor, spaceId, sourceId]
  );

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
