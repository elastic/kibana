/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpHandler } from '@kbn/core/public';
import {
  ValidateLogEntryDatasetsResponsePayload,
  ValidationIndicesResponsePayload,
} from '../../../common/http_api/log_analysis';
import { DeleteJobsResponsePayload } from './api/ml_cleanup';
import { FetchJobStatusResponsePayload } from './api/ml_get_jobs_summary_api';
import { GetMlModuleResponsePayload } from './api/ml_get_module';
import { SetupMlModuleResponsePayload } from './api/ml_setup_module_api';

export type { JobModelSizeStats, JobSummary } from './api/ml_get_jobs_summary_api';

export interface SetUpModuleArgs {
  start?: number | undefined;
  end?: number | undefined;
  filter?: any;
  moduleSourceConfiguration: ModuleSourceConfiguration;
  partitionField?: string;
}

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
    setUpModuleArgs: SetUpModuleArgs,
    fetch: HttpHandler
  ) => Promise<SetupMlModuleResponsePayload>;
  cleanUpModule: (
    spaceId: string,
    sourceId: string,
    fetch: HttpHandler
  ) => Promise<DeleteJobsResponsePayload>;
  validateSetupIndices?: (
    indices: string[],
    fetch: HttpHandler
  ) => Promise<ValidationIndicesResponsePayload>;
  validateSetupDatasets?: (
    indices: string[],
    startTime: number,
    endTime: number,
    fetch: HttpHandler
  ) => Promise<ValidateLogEntryDatasetsResponsePayload>;
}

export interface ModuleSourceConfiguration {
  indices: string[];
  sourceId: string;
  spaceId: string;
}

interface ManyCategoriesWarningReason {
  type: 'manyCategories';
  categoriesDocumentRatio: number;
}

interface ManyDeadCategoriesWarningReason {
  type: 'manyDeadCategories';
  deadCategoriesRatio: number;
}

interface ManyRareCategoriesWarningReason {
  type: 'manyRareCategories';
  rareCategoriesRatio: number;
}

interface NoFrequentCategoriesWarningReason {
  type: 'noFrequentCategories';
}

interface SingleCategoryWarningReason {
  type: 'singleCategory';
}

export type CategoryQualityWarningReason =
  | ManyCategoriesWarningReason
  | ManyDeadCategoriesWarningReason
  | ManyRareCategoriesWarningReason
  | NoFrequentCategoriesWarningReason
  | SingleCategoryWarningReason;

export type CategoryQualityWarningReasonType = CategoryQualityWarningReason['type'];

export interface CategoryQualityWarning {
  type: 'categoryQualityWarning';
  jobId: string;
  reasons: CategoryQualityWarningReason[];
}

export type QualityWarning = CategoryQualityWarning;
