/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo, useState } from 'react';
import { getJobId } from '../../../common/log_analysis';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { useTrackedPromise } from '../../utils/use_tracked_promise';
import { JobSummary } from './api/ml_get_jobs_summary_api';
import { GetMlModuleResponsePayload, JobDefinition } from './api/ml_get_module';
import { ModuleDescriptor, ModuleSourceConfiguration } from './infra_ml_module_types';

export const useInfraMLModuleDefinition = <JobType extends string>({
  sourceConfiguration: { spaceId, sourceId },
  moduleDescriptor,
}: {
  sourceConfiguration: ModuleSourceConfiguration;
  moduleDescriptor: ModuleDescriptor<JobType>;
}) => {
  const { services } = useKibanaContextForPlugin();
  const [moduleDefinition, setModuleDefinition] = useState<
    GetMlModuleResponsePayload | undefined
  >();

  const jobDefinitionByJobId = useMemo(
    () =>
      moduleDefinition
        ? moduleDefinition.jobs.reduce<Record<string, JobDefinition>>(
            (accumulatedJobDefinitions, jobDefinition) => ({
              ...accumulatedJobDefinitions,
              [getJobId(spaceId, sourceId, jobDefinition.id)]: jobDefinition,
            }),
            {}
          )
        : {},
    [moduleDefinition, sourceId, spaceId]
  );

  const [fetchModuleDefinitionRequest, fetchModuleDefinition] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await moduleDescriptor.getModuleDefinition(services.http.fetch);
      },
      onResolve: (response) => {
        setModuleDefinition(response);
      },
      onReject: () => {
        setModuleDefinition(undefined);
      },
    },
    [moduleDescriptor.getModuleDefinition, spaceId, sourceId]
  );

  const getIsJobDefinitionOutdated = useCallback(
    (jobSummary: JobSummary): boolean => {
      const jobDefinition: JobDefinition | undefined = jobDefinitionByJobId[jobSummary.id];

      if (jobDefinition == null) {
        return false;
      }

      const currentRevision = jobDefinition?.config.custom_settings.job_revision;
      return (jobSummary.fullJob?.custom_settings?.job_revision ?? 0) < (currentRevision ?? 0);
    },
    [jobDefinitionByJobId]
  );

  return {
    fetchModuleDefinition,
    fetchModuleDefinitionRequestState: fetchModuleDefinitionRequest.state,
    getIsJobDefinitionOutdated,
    jobDefinitionByJobId,
    moduleDefinition,
  };
};
