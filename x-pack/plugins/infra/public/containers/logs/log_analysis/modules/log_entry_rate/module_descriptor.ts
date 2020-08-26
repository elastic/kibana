/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
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

const getJobSummary = async (spaceId: string, sourceId: string) => {
  const response = await callJobsSummaryAPI(spaceId, sourceId, logEntryRateJobTypes);
  const jobIds = Object.values(getJobIds(spaceId, sourceId));

  return response.filter((jobSummary) => jobIds.includes(jobSummary.id));
};

const getModuleDefinition = async () => {
  return await callGetMlModuleAPI(moduleId);
};

const setUpModule = async (
  start: number | undefined,
  end: number | undefined,
  datasetFilter: DatasetFilter,
  { spaceId, sourceId, indices, timestampField }: ModuleSourceConfiguration
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
    moduleId,
    start,
    end,
    spaceId,
    sourceId,
    indexNamePattern,
    jobOverrides,
    [],
    query
  );
};

const cleanUpModule = async (spaceId: string, sourceId: string) => {
  return await cleanUpJobsAndDatafeeds(spaceId, sourceId, logEntryRateJobTypes);
};

const validateSetupIndices = async (indices: string[], timestampField: string) => {
  return await callValidateIndicesAPI(indices, [
    {
      name: timestampField,
      validTypes: ['date'],
    },
    {
      name: partitionField,
      validTypes: ['keyword'],
    },
  ]);
};

const validateSetupDatasets = async (
  indices: string[],
  timestampField: string,
  startTime: number,
  endTime: number
) => {
  return await callValidateDatasetsAPI(indices, timestampField, startTime, endTime);
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
