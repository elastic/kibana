/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AugmentedSecurityJobFields,
  Module,
  ModuleJob,
  RecognizerModule,
  SecurityJob,
} from '../types';
import { mlModules } from '../ml_modules';
import { MlSummaryJob } from '../../../../../../ml/public';

/**
 * Helper function for converting from ModuleJob -> SecurityJob
 * @param module
 * @param moduleJob
 * @param isCompatible
 */
export const moduleToSecurityJob = (
  module: Module,
  moduleJob: ModuleJob,
  isCompatible: boolean
): SecurityJob => {
  return {
    datafeedId: '',
    datafeedIndices: [],
    datafeedState: '',
    hasDatafeed: false,
    isSingleMetricViewerJob: false,
    jobState: '',
    memory_status: '',
    processed_record_count: 0,
    id: moduleJob.id,
    description: moduleJob.config.description,
    groups: [...moduleJob.config.groups].sort(),
    defaultIndexPattern: module.defaultIndexPattern,
    moduleId: module.id,
    isCompatible,
    isInstalled: false,
    isElasticJob: true,
    awaitingNodeAssignment: false,
    jobTags: {},
    bucketSpanSeconds: 900,
  };
};

/**
 * Returns fields necessary to augment a ModuleJob to a SecurityJob
 *
 * @param jobId
 * @param moduleJobs
 * @param compatibleModuleIds
 */
export const getAugmentedFields = (
  jobId: string,
  moduleJobs: SecurityJob[],
  compatibleModuleIds: string[]
): AugmentedSecurityJobFields => {
  const moduleJob = moduleJobs.find((mj) => mj.id === jobId);
  return moduleJob !== undefined
    ? {
        moduleId: moduleJob.moduleId,
        defaultIndexPattern: moduleJob.defaultIndexPattern,
        isCompatible: compatibleModuleIds.includes(moduleJob.moduleId),
        isElasticJob: true,
      }
    : {
        moduleId: '',
        defaultIndexPattern: '',
        isCompatible: true,
        isElasticJob: false,
      };
};

/**
 * Process Modules[] from the `get_module` ML API into SecurityJobs[] by filtering to Security specific
 * modules and unpacking jobs from each module
 *
 * @param modulesData
 * @param compatibleModuleIds
 */
export const getModuleJobs = (
  modulesData: Module[],
  compatibleModuleIds: string[]
): SecurityJob[] =>
  modulesData
    .filter((module) => mlModules.includes(module.id))
    .map((module) => [
      ...module.jobs.map((moduleJob) =>
        moduleToSecurityJob(module, moduleJob, compatibleModuleIds.includes(module.id))
      ),
    ])
    .flat();

/**
 * Process data from the `jobs_summary` ML API into SecurityJobs[] by filtering to Security jobs
 * and augmenting with moduleId/defaultIndexPattern/isCompatible
 *
 * @param jobSummaryData
 * @param moduleJobs
 * @param compatibleModuleIds
 */
export const getInstalledJobs = (
  jobSummaryData: MlSummaryJob[],
  moduleJobs: SecurityJob[],
  compatibleModuleIds: string[]
): SecurityJob[] =>
  jobSummaryData
    .filter(({ groups }) => groups.includes('siem') || groups.includes('security'))
    .map<SecurityJob>((jobSummary) => ({
      ...jobSummary,
      ...getAugmentedFields(jobSummary.id, moduleJobs, compatibleModuleIds),
      isInstalled: true,
    }));

/**
 * Combines installed jobs + moduleSecurityJobs that don't overlap and sorts by name asc
 *
 * @param installedJobs
 * @param moduleSecurityJobs
 */
export const composeModuleAndInstalledJobs = (
  installedJobs: SecurityJob[],
  moduleSecurityJobs: SecurityJob[]
): SecurityJob[] => {
  const installedJobsIds = installedJobs.map((installedJob) => installedJob.id);

  return [
    ...installedJobs,
    ...moduleSecurityJobs.filter((mj) => !installedJobsIds.includes(mj.id)),
  ].sort((a, b) => a.id.localeCompare(b.id));
};
/**
 * Creates a list of SecurityJobs by composing jobs summaries (installed jobs) and Module
 * jobs (pre-packaged Security jobs) into a single job object that can be used throughout the Security app
 *
 * @param jobSummaryData
 * @param modulesData
 * @param compatibleModules
 */
export const createSecurityJobs = (
  jobSummaryData: MlSummaryJob[],
  modulesData: Module[],
  compatibleModules: RecognizerModule[]
): SecurityJob[] => {
  // Create lookup of compatible modules
  const compatibleModuleIds = compatibleModules.map((module) => module.id);

  // Process modulesData: Filter to Security specific modules, and unpack jobs from modules
  const moduleSecurityJobs = getModuleJobs(modulesData, compatibleModuleIds);

  // Process jobSummaryData: Filter to Security jobs, and augment with moduleId/defaultIndexPattern/isCompatible
  const installedJobs = getInstalledJobs(jobSummaryData, moduleSecurityJobs, compatibleModuleIds);

  // Combine installed jobs + moduleSecurityJobs that don't overlap, and sort by name asc
  return composeModuleAndInstalledJobs(installedJobs, moduleSecurityJobs);
};
