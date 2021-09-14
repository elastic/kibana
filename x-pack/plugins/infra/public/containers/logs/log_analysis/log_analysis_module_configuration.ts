/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import equal from 'fast-deep-equal';
import { JobSummary } from './api/ml_get_jobs_summary_api';
import { ModuleDescriptor, ModuleSourceConfiguration } from './log_analysis_module_types';

export const useLogAnalysisModuleConfiguration = <JobType extends string>({
  moduleDescriptor,
  sourceConfiguration,
}: {
  moduleDescriptor: ModuleDescriptor<JobType>;
  sourceConfiguration: ModuleSourceConfiguration;
}) => {
  const getIsJobConfigurationOutdated = useMemo(
    () => isJobConfigurationOutdated(moduleDescriptor, sourceConfiguration),
    [sourceConfiguration, moduleDescriptor]
  );

  return {
    getIsJobConfigurationOutdated,
  };
};

export const isJobConfigurationOutdated = <JobType extends string>(
  { bucketSpan }: ModuleDescriptor<JobType>,
  currentSourceConfiguration: ModuleSourceConfiguration
) => (jobSummary: JobSummary): boolean => {
  if (
    !jobSummary.fullJob ||
    !jobSummary.fullJob.custom_settings ||
    !jobSummary.fullJob.datafeed_config
  ) {
    return false;
  }

  const jobConfiguration = jobSummary.fullJob.custom_settings.logs_source_config;
  const datafeedRuntimeMappings = jobSummary.fullJob.datafeed_config.runtime_mappings ?? {};

  return !(
    jobConfiguration &&
    jobConfiguration.bucketSpan === bucketSpan &&
    jobConfiguration.indexPattern &&
    isSubset(
      new Set(jobConfiguration.indexPattern.split(',')),
      new Set(currentSourceConfiguration.indices)
    ) &&
    jobConfiguration.timestampField === currentSourceConfiguration.timestampField &&
    equal(datafeedRuntimeMappings, currentSourceConfiguration.runtimeMappings)
  );
};

const isSubset = <T>(subset: Set<T>, superset: Set<T>) => {
  return Array.from(subset).every((subsetElement) => superset.has(subsetElement));
};
