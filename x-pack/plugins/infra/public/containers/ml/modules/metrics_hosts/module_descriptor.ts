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
import {
  metricsHostsJobTypes,
  getJobId,
  MetricsHostsJobType,
  DatasetFilter,
  bucketSpan,
} from '../../../../../common/infra_ml';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import MemoryJob from '../../../../../../ml/server/models/data_recognizer/modules/metrics_ui_hosts/ml/hosts_memory_usage.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import MemoryDatafeed from '../../../../../../ml/server/models/data_recognizer/modules/metrics_ui_hosts/ml/datafeed_hosts_memory_usage.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import NetworkInJob from '../../../../../../ml/server/models/data_recognizer/modules/metrics_ui_hosts/ml/hosts_network_in.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import NetworkInDatafeed from '../../../../../../ml/server/models/data_recognizer/modules/metrics_ui_hosts/ml/datafeed_hosts_network_in.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import NetworkOutJob from '../../../../../../ml/server/models/data_recognizer/modules/metrics_ui_hosts/ml/hosts_network_out.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import NetworkOutDatafeed from '../../../../../../ml/server/models/data_recognizer/modules/metrics_ui_hosts/ml/datafeed_hosts_network_out.json';

type JobType = 'hosts_memory_usage' | 'hosts_network_in' | 'hosts_network_out';
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
  partitionField?: string
) => {
  const indexNamePattern = indices.join(',');
  const jobIds: JobType[] = ['hosts_memory_usage', 'hosts_network_in', 'hosts_network_out'];

  const jobOverrides = jobIds.map((id) => {
    const { job: defaultJobConfig } = getDefaultJobConfigs(id);

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const analysis_config = {
      ...defaultJobConfig.analysis_config,
    };

    if (partitionField) {
      analysis_config.detectors[0].partition_field_name = partitionField;
      if (analysis_config.influencers.indexOf(partitionField) === -1) {
        analysis_config.influencers.push(partitionField);
      }
    }

    return {
      job_id: id,
      data_description: {
        time_field: timestampField,
      },
      analysis_config,
      custom_settings: {
        metrics_source_config: {
          indexPattern: indexNamePattern,
          timestampField,
          bucketSpan,
        },
      },
    };
  });

  const datafeedOverrides = jobIds.map((id) => {
    const { datafeed: defaultDatafeedConfig } = getDefaultJobConfigs(id);

    if (!partitionField || id === 'hosts_memory_usage') {
      // Since the host memory usage doesn't have custom aggs, we don't need to do anything to add a partition field
      return defaultDatafeedConfig;
    }

    // If we have a partition field, we need to change the aggregation to do a terms agg at the top level
    const aggregations = {
      [partitionField]: {
        terms: {
          field: partitionField,
        },
        aggregations: {
          ...defaultDatafeedConfig.aggregations,
        },
      },
    };

    return {
      ...defaultDatafeedConfig,
      job_id: id,
      aggregations,
    };
  });

  return callSetupMlModuleAPI(
    moduleId,
    start,
    end,
    spaceId,
    sourceId,
    indexNamePattern,
    jobOverrides,
    datafeedOverrides
  );
};

const getDefaultJobConfigs = (jobId: JobType) => {
  switch (jobId) {
    case 'hosts_memory_usage':
      return {
        datafeed: MemoryDatafeed,
        job: MemoryJob,
      };
    case 'hosts_network_in':
      return {
        datafeed: NetworkInDatafeed,
        job: NetworkInJob,
      };
    case 'hosts_network_out':
      return {
        datafeed: NetworkOutDatafeed,
        job: NetworkOutJob,
      };
  }
};

const cleanUpModule = async (spaceId: string, sourceId: string) => {
  return await cleanUpJobsAndDatafeeds(spaceId, sourceId, metricsHostsJobTypes);
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
};
