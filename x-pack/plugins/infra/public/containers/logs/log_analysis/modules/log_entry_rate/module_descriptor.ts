/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { HttpHandler } from 'src/core/public';
import {
  bucketSpan,
  DatasetFilter,
  getJobId,
  LogEntryRateJobType,
  logEntryRateJobTypes,
  partitionField,
} from '../../../../../../common/log_analysis';
import { ModuleDescriptor, ModuleSourceConfiguration } from '../../log_analysis_module_types';
import { cleanUpJobsAndDatafeeds } from '../../log_analysis_cleanup';
import { callJobsSummaryAPI } from '../../api/ml_get_jobs_summary_api';
import { callGetMlModuleAPI } from '../../api/ml_get_module';
import { callSetupMlModuleAPI } from '../../api/ml_setup_module_api';
import { callValidateDatasetsAPI } from '../../api/validate_datasets';
import { callValidateIndicesAPI } from '../../api/validate_indices';

const moduleId = 'logs_ui_analysis';
const moduleName = i18n.translate('xpack.infra.logs.analysis.logEntryRateModuleName', {
  defaultMessage: 'Log rate',
});
const moduleDescription = i18n.translate(
  'xpack.infra.logs.analysis.logEntryRateModuleDescription',
  {
    defaultMessage: 'Use Machine Learning to automatically detect anomalous log entry rates.',
  }
);

const getJobIds = (spaceId: string, sourceId: string) =>
  logEntryRateJobTypes.reduce(
    (accumulatedJobIds, jobType) => ({
      ...accumulatedJobIds,
      [jobType]: getJobId(spaceId, sourceId, jobType),
    }),
    {} as Record<LogEntryRateJobType, string>
  );

const getJobSummary = async (spaceId: string, sourceId: string, fetch: HttpHandler) => {
  const response = await callJobsSummaryAPI(
    { spaceId, sourceId, jobTypes: logEntryRateJobTypes },
    fetch
  );
  const jobIds = Object.values(getJobIds(spaceId, sourceId));

  return response.filter((jobSummary) => jobIds.includes(jobSummary.id));
};

const getModuleDefinition = async (fetch: HttpHandler) => {
  return await callGetMlModuleAPI(moduleId, fetch);
};

const setUpModule = async (
  start: number | undefined,
  end: number | undefined,
  datasetFilter: DatasetFilter,
  { spaceId, sourceId, indices, timestampField, runtimeMappings }: ModuleSourceConfiguration,
  fetch: HttpHandler
) => {
  const indexNamePattern = indices.join(',');
  const jobOverrides = [
    {
      job_id: 'log-entry-rate' as const,
      analysis_config: {
        bucket_span: `${bucketSpan}ms`,
      },
      data_description: {
        time_field: timestampField,
      },
      custom_settings: {
        logs_source_config: {
          indexPattern: indexNamePattern,
          timestampField,
          bucketSpan,
        },
      },
    },
  ];
  const datafeedOverrides = [
    {
      job_id: 'log-entry-rate' as const,
      runtime_mappings: runtimeMappings,
    },
  ];
  const query =
    datasetFilter.type === 'includeSome'
      ? {
          bool: {
            filter: [
              {
                terms: {
                  'event.dataset': datasetFilter.datasets,
                },
              },
            ],
          },
        }
      : undefined;

  return callSetupMlModuleAPI(
    {
      moduleId,
      start,
      end,
      spaceId,
      sourceId,
      indexPattern: indexNamePattern,
      jobOverrides,
      datafeedOverrides,
      query,
      useDedicatedIndex: true,
    },
    fetch
  );
};

const cleanUpModule = async (spaceId: string, sourceId: string, fetch: HttpHandler) => {
  return await cleanUpJobsAndDatafeeds(spaceId, sourceId, logEntryRateJobTypes, fetch);
};

const validateSetupIndices = async (
  indices: string[],
  timestampField: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  fetch: HttpHandler
) => {
  return await callValidateIndicesAPI(
    {
      indices,
      fields: [
        {
          name: timestampField,
          validTypes: ['date'],
        },
        {
          name: partitionField,
          validTypes: ['keyword'],
        },
      ],
      runtimeMappings,
    },
    fetch
  );
};

const validateSetupDatasets = async (
  indices: string[],
  timestampField: string,
  startTime: number,
  endTime: number,
  runtimeMappings: estypes.MappingRuntimeFields,
  fetch: HttpHandler
) => {
  return await callValidateDatasetsAPI(
    { indices, timestampField, startTime, endTime, runtimeMappings },
    fetch
  );
};

export const logEntryRateModule: ModuleDescriptor<LogEntryRateJobType> = {
  moduleId,
  moduleName,
  moduleDescription,
  jobTypes: logEntryRateJobTypes,
  bucketSpan,
  getJobIds,
  getJobSummary,
  getModuleDefinition,
  setUpModule,
  cleanUpModule,
  validateSetupDatasets,
  validateSetupIndices,
};
