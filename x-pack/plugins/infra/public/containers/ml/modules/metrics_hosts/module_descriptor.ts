/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ModuleDescriptor, ModuleSourceConfiguration } from '../../infra_ml_module_types';
import { cleanUpJobsAndDatafeeds } from '../../infra_ml_cleanup';
import { callJobsSummaryAPI } from '../../api/ml_get_jobs_summary_api';
import { callGetMlModuleAPI } from '../../api/ml_get_module';
import { callSetupMlModuleAPI } from '../../api/ml_setup_module_api';
import { callValidateIndicesAPI } from '../../../logs/log_analysis/api/validate_indices';
import { callValidateDatasetsAPI } from '../../../logs/log_analysis/api/validate_datasets';
import {
  metricsHostsJobTypes,
  getJobId,
  MetricsHostsJobType,
  DatasetFilter,
  bucketSpan,
  partitionField,
} from '../../../../../common/infra_ml';

const moduleId = 'metrics_ui_hosts';
const moduleName = i18n.translate('xpack.infra.ml.metricsModuleName', {
  defaultMessage: 'Metrics anomanly detection',
});
const moduleDescription = i18n.translate('xpack.infra.ml.metricsHostModuleDescription', {
  defaultMessage: 'Use Machine Learning to automatically detect anomalous log entry rates.',
});

const getJobIds = (spaceId: string, sourceId: string) =>
  metricsHostsJobTypes.reduce(
    (accumulatedJobIds, jobType) => ({
      ...accumulatedJobIds,
      [jobType]: getJobId(spaceId, sourceId, jobType),
    }),
    {} as Record<MetricsHostsJobType, string>
  );

const getJobSummary = async (spaceId: string, sourceId: string) => {
  const response = await callJobsSummaryAPI(spaceId, sourceId, metricsHostsJobTypes);
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
  { spaceId, sourceId, indices, timestampField }: ModuleSourceConfiguration,
  pField?: string
) => {
  const indexNamePattern = indices.join(',');
  const jobIds = ['hosts_memory_usage', 'hosts_network_in', 'hosts_network_out'];
  const jobOverrides = jobIds.map((id) => ({
    job_id: id,
    data_description: {
      time_field: timestampField,
    },
    custom_settings: {
      metrics_source_config: {
        indexPattern: indexNamePattern,
        timestampField,
        bucketSpan,
      },
    },
  }));

  return callSetupMlModuleAPI(
    moduleId,
    start,
    end,
    spaceId,
    sourceId,
    indexNamePattern,
    jobOverrides,
    []
  );
};

const cleanUpModule = async (spaceId: string, sourceId: string) => {
  return await cleanUpJobsAndDatafeeds(spaceId, sourceId, metricsHostsJobTypes);
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

export const metricHostsModule: ModuleDescriptor<MetricsHostsJobType> = {
  moduleId,
  moduleName,
  moduleDescription,
  jobTypes: metricsHostsJobTypes,
  bucketSpan,
  getJobIds,
  getJobSummary,
  getModuleDefinition,
  setUpModule,
  cleanUpModule,
  validateSetupDatasets,
  validateSetupIndices,
};
