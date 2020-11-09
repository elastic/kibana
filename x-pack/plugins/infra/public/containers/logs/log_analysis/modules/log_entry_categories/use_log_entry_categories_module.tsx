/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useMemo } from 'react';
import { useLogAnalysisModule } from '../../log_analysis_module';
import { useLogAnalysisModuleConfiguration } from '../../log_analysis_module_configuration';
import { useLogAnalysisModuleDefinition } from '../../log_analysis_module_definition';
import { ModuleSourceConfiguration } from '../../log_analysis_module_types';
import { logEntryCategoriesModule } from './module_descriptor';
import { useLogEntryCategoriesQuality } from './use_log_entry_categories_quality';

export const useLogEntryCategoriesModule = ({
  indexPattern,
  sourceId,
  spaceId,
  timestampField,
}: {
  indexPattern: string;
  sourceId: string;
  spaceId: string;
  timestampField: string;
}) => {
  const sourceConfiguration: ModuleSourceConfiguration = useMemo(
    () => ({
      indices: indexPattern.split(','),
      sourceId,
      spaceId,
      timestampField,
    }),
    [indexPattern, sourceId, spaceId, timestampField]
  );

  const logAnalysisModule = useLogAnalysisModule({
    moduleDescriptor: logEntryCategoriesModule,
    sourceConfiguration,
  });

  const { getIsJobConfigurationOutdated } = useLogAnalysisModuleConfiguration({
    sourceConfiguration,
    moduleDescriptor: logEntryCategoriesModule,
  });

  const { fetchModuleDefinition, getIsJobDefinitionOutdated } = useLogAnalysisModuleDefinition({
    sourceConfiguration,
    moduleDescriptor: logEntryCategoriesModule,
  });

  const { categoryQualityWarnings } = useLogEntryCategoriesQuality({
    jobSummaries: logAnalysisModule.jobSummaries,
  });

  const hasOutdatedJobConfigurations = useMemo(
    () => logAnalysisModule.jobSummaries.some(getIsJobConfigurationOutdated),
    [getIsJobConfigurationOutdated, logAnalysisModule.jobSummaries]
  );

  const hasOutdatedJobDefinitions = useMemo(
    () => logAnalysisModule.jobSummaries.some(getIsJobDefinitionOutdated),
    [getIsJobDefinitionOutdated, logAnalysisModule.jobSummaries]
  );

  const hasStoppedJobs = useMemo(
    () =>
      Object.values(logAnalysisModule.jobStatus).some(
        (currentJobStatus) => currentJobStatus === 'stopped'
      ),
    [logAnalysisModule.jobStatus]
  );

  return {
    ...logAnalysisModule,
    categoryQualityWarnings,
    fetchModuleDefinition,
    hasOutdatedJobConfigurations,
    hasOutdatedJobDefinitions,
    hasStoppedJobs,
  };
};

export const [
  LogEntryCategoriesModuleProvider,
  useLogEntryCategoriesModuleContext,
] = createContainer(useLogEntryCategoriesModule);
