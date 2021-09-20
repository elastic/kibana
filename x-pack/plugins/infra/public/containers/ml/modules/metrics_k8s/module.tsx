/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useMemo } from 'react';
import { useInfraMLModule } from '../../infra_ml_module';
import { useInfraMLModuleConfiguration } from '../../infra_ml_module_configuration';
import { useInfraMLModuleDefinition } from '../../infra_ml_module_definition';
import { ModuleSourceConfiguration } from '../../infra_ml_module_types';
import { metricHostsModule } from './module_descriptor';

export const useMetricK8sModule = ({
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

  const infraMLModule = useInfraMLModule({
    moduleDescriptor: metricHostsModule,
    sourceConfiguration,
  });

  const { getIsJobConfigurationOutdated } = useInfraMLModuleConfiguration({
    sourceConfiguration,
    moduleDescriptor: metricHostsModule,
  });

  const { fetchModuleDefinition, getIsJobDefinitionOutdated } = useInfraMLModuleDefinition({
    sourceConfiguration,
    moduleDescriptor: metricHostsModule,
  });

  const hasOutdatedJobConfigurations = useMemo(
    () => infraMLModule.jobSummaries.some(getIsJobConfigurationOutdated),
    [getIsJobConfigurationOutdated, infraMLModule.jobSummaries]
  );

  const hasOutdatedJobDefinitions = useMemo(
    () => infraMLModule.jobSummaries.some(getIsJobDefinitionOutdated),
    [getIsJobDefinitionOutdated, infraMLModule.jobSummaries]
  );

  const hasStoppedJobs = useMemo(
    () =>
      Object.values(infraMLModule.jobStatus).some(
        (currentJobStatus) => currentJobStatus === 'stopped'
      ),
    [infraMLModule.jobStatus]
  );

  return {
    ...infraMLModule,
    fetchModuleDefinition,
    hasOutdatedJobConfigurations,
    hasOutdatedJobDefinitions,
    hasStoppedJobs,
  };
};

export const [MetricK8sModuleProvider, useMetricK8sModuleContext] =
  createContainer(useMetricK8sModule);
