/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ValidateLogEntryDatasetsResponsePayload,
  ValidationIndicesResponsePayload,
} from '../../../../common/http_api/log_analysis';
import { DatasetFilter } from '../../../../common/log_analysis';
import { DeleteJobsResponsePayload } from './api/ml_cleanup';
import { FetchJobStatusResponsePayload } from './api/ml_get_jobs_summary_api';
import { GetMlModuleResponsePayload } from './api/ml_get_module';
import { SetupMlModuleResponsePayload } from './api/ml_setup_module_api';

export type { JobModelSizeStats, JobSummary } from './api/ml_get_jobs_summary_api';

export interface ModuleDescriptor<JobType extends string> {
  moduleId: string;
  moduleName: string;
  moduleDescription: string;
  jobTypes: JobType[];
  bucketSpan: number;
  getJobIds: (spaceId: string, sourceId: string) => Record<JobType, string>;
  getJobSummary: (
    spaceId: string,
    sourceId: string,
    fetch: HttpHandler
  ) => Promise<FetchJobStatusResponsePayload>;
  getModuleDefinition: (fetch: HttpHandler) => Promise<GetMlModuleResponsePayload>;
  setUpModule: (
    start: number | undefined,
    end: number | undefined,
    datasetFilter: DatasetFilter,
    sourceConfiguration: ModuleSourceConfiguration,
    fetch: HttpHandler
  ) => Promise<SetupMlModuleResponsePayload>;
  cleanUpModule: (
    spaceId: string,
    sourceId: string,
    fetch: HttpHandler
  ) => Promise<DeleteJobsResponsePayload>;
  validateSetupIndices: (
    indices: string[],
    timestampField: string,
    runtimeMappings: estypes.MappingRuntimeFields,
    fetch: HttpHandler
  ) => Promise<ValidationIndicesResponsePayload>;
  validateSetupDatasets: (
    indices: string[],
    timestampField: string,
    startTime: number,
    endTime: number,
    runtimeMappings: estypes.MappingRuntimeFields,
    fetch: HttpHandler
  ) => Promise<ValidateLogEntryDatasetsResponsePayload>;
}

export interface ModuleSourceConfiguration {
  indices: string[];
  sourceId: string;
  spaceId: string;
  timestampField: string;
  runtimeMappings: estypes.MappingRuntimeFields;
}
