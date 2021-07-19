/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import createContainer from 'constate';
import { useMemo } from 'react';
import { ModuleSourceConfiguration } from '../../log_analysis_module_types';
import { useLogAnalysisModule } from '../../log_analysis_module';
import { useLogAnalysisModuleConfiguration } from '../../log_analysis_module_configuration';
import { useLogAnalysisModuleDefinition } from '../../log_analysis_module_definition';
import { logEntryRateModule } from './module_descriptor';

export const useLogEntryRateModule = ({
  indexPattern,
  sourceId,
  spaceId,
  timestampField,
  runtimeMappings,
}: {
  indexPattern: string;
  sourceId: string;
  spaceId: string;
  timestampField: string;
  runtimeMappings: estypes.MappingRuntimeFields;
}) => {
  const sourceConfiguration: ModuleSourceConfiguration = useMemo(
    () => ({
      indices: indexPattern.split(','),
      sourceId,
      spaceId,
      timestampField,
      runtimeMappings,
    }),
    [indexPattern, sourceId, spaceId, timestampField, runtimeMappings]
  );

  const logAnalysisModule = useLogAnalysisModule({
    moduleDescriptor: logEntryRateModule,
    sourceConfiguration,
  });

  const { getIsJobConfigurationOutdated } = useLogAnalysisModuleConfiguration({
    sourceConfiguration,
    moduleDescriptor: logEntryRateModule,
  });

  const { fetchModuleDefinition, getIsJobDefinitionOutdated } = useLogAnalysisModuleDefinition({
    sourceConfiguration,
    moduleDescriptor: logEntryRateModule,
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
    fetchModuleDefinition,
    hasOutdatedJobConfigurations,
    hasOutdatedJobDefinitions,
    hasStoppedJobs,
  };
};

export const [LogEntryRateModuleProvider, useLogEntryRateModuleContext] = createContainer(
  useLogEntryRateModule
);
