/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import { useLogMlJobIdFormatsShimContext } from '../../../pages/logs/shared/use_log_ml_job_id_formats_shim';
import { IdFormat, JobType } from '../../../../common/http_api/latest';
import { DatasetFilter } from '../../../../common/log_analysis';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useTrackedPromise } from '../../../hooks/use_tracked_promise';
import { useModuleStatus } from './log_analysis_module_status';
import { ModuleDescriptor, ModuleSourceConfiguration } from './log_analysis_module_types';

export const useLogAnalysisModule = <T extends JobType>({
  sourceConfiguration,
  idFormat,
  moduleDescriptor,
}: {
  sourceConfiguration: ModuleSourceConfiguration;
  idFormat: IdFormat;
  moduleDescriptor: ModuleDescriptor<T>;
}) => {
  const { services } = useKibanaContextForPlugin();
  const { spaceId, sourceId: logViewId, timestampField, runtimeMappings } = sourceConfiguration;
  const [moduleStatus, dispatchModuleStatus] = useModuleStatus(moduleDescriptor.jobTypes);
  const { migrateIdFormat } = useLogMlJobIdFormatsShimContext();

  const trackMetric = useUiTracker({ app: 'infra_logs' });

  const [, fetchJobStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        dispatchModuleStatus({ type: 'fetchingJobStatuses' });
        return await moduleDescriptor.getJobSummary(
          spaceId,
          logViewId,
          idFormat,
          services.http.fetch
        );
      },
      onResolve: (jobResponse) => {
        dispatchModuleStatus({
          type: 'fetchedJobStatuses',
          payload: jobResponse,
          spaceId,
          logViewId,
          idFormat,
        });
      },
      onReject: () => {
        dispatchModuleStatus({ type: 'failedFetchingJobStatuses' });
      },
    },
    [spaceId, logViewId, idFormat]
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
            sourceId: logViewId,
            spaceId,
            timestampField,
            runtimeMappings,
          },
          services.http.fetch
        );
        const jobSummaries = await moduleDescriptor.getJobSummary(
          spaceId,
          logViewId,
          'hashed',
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
          logViewId,
          idFormat: 'hashed',
        });
        migrateIdFormat(moduleDescriptor.jobTypes[0]);
      },
      onReject: (e: any) => {
        dispatchModuleStatus({ type: 'failedSetup' });
        if (e?.body?.statusCode === 403) {
          trackMetric({ metric: 'logs_ml_setup_error_lack_of_privileges' });
        }
      },
    },
    [moduleDescriptor.setUpModule, spaceId, logViewId, timestampField]
  );

  const [cleanUpModuleRequest, cleanUpModule] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await moduleDescriptor.cleanUpModule(
          spaceId,
          logViewId,
          idFormat,
          services.http.fetch
        );
      },
      onReject: (e) => {
        throw new Error(`Failed to clean up previous ML job: ${e}`);
      },
    },
    [spaceId, logViewId, idFormat]
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
        .catch((e) => {
          dispatchModuleStatus({ type: 'failedSetup', reason: e.toString() });
        });
    },
    [cleanUpModule, dispatchModuleStatus, setUpModule]
  );

  const viewResults = useCallback(() => {
    dispatchModuleStatus({ type: 'viewedResults' });
  }, [dispatchModuleStatus]);

  const jobIds = useMemo(
    () => moduleDescriptor.getJobIds(spaceId, logViewId, idFormat),
    [moduleDescriptor, spaceId, logViewId, idFormat]
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
