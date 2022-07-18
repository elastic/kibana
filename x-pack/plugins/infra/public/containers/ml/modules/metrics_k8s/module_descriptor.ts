/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HttpHandler } from '@kbn/core/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import MemoryJob from '@kbn/ml-plugin/server/models/data_recognizer/modules/metrics_ui_k8s/ml/k8s_memory_usage.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import MemoryDatafeed from '@kbn/ml-plugin/server/models/data_recognizer/modules/metrics_ui_k8s/ml/datafeed_k8s_memory_usage.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import NetworkInJob from '@kbn/ml-plugin/server/models/data_recognizer/modules/metrics_ui_k8s/ml/k8s_network_in.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import NetworkInDatafeed from '@kbn/ml-plugin/server/models/data_recognizer/modules/metrics_ui_k8s/ml/datafeed_k8s_network_in.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import NetworkOutJob from '@kbn/ml-plugin/server/models/data_recognizer/modules/metrics_ui_k8s/ml/k8s_network_out.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import NetworkOutDatafeed from '@kbn/ml-plugin/server/models/data_recognizer/modules/metrics_ui_k8s/ml/datafeed_k8s_network_out.json';
import { ModuleDescriptor, SetUpModuleArgs } from '../../infra_ml_module_types';
import { cleanUpJobsAndDatafeeds } from '../../infra_ml_cleanup';
import { callJobsSummaryAPI } from '../../api/ml_get_jobs_summary_api';
import { callGetMlModuleAPI } from '../../api/ml_get_module';
import { callSetupMlModuleAPI } from '../../api/ml_setup_module_api';
import {
  metricsK8SJobTypes,
  getJobId,
  MetricK8sJobType,
  bucketSpan,
} from '../../../../../common/infra_ml';
import { TIMESTAMP_FIELD } from '../../../../../common/constants';

type JobType = 'k8s_memory_usage' | 'k8s_network_in' | 'k8s_network_out';
export const DEFAULT_K8S_PARTITION_FIELD = 'kubernetes.namespace';
const moduleId = 'metrics_ui_k8s';
const moduleName = i18n.translate('xpack.infra.ml.metricsModuleName', {
  defaultMessage: 'Metrics anomanly detection',
});
const moduleDescription = i18n.translate('xpack.infra.ml.metricsHostModuleDescription', {
  defaultMessage: 'Use Machine Learning to automatically detect anomalous log entry rates.',
});

const getJobIds = (spaceId: string, sourceId: string) =>
  metricsK8SJobTypes.reduce(
    (accumulatedJobIds, jobType) => ({
      ...accumulatedJobIds,
      [jobType]: getJobId(spaceId, sourceId, jobType),
    }),
    {} as Record<MetricK8sJobType, string>
  );

const getJobSummary = async (spaceId: string, sourceId: string, fetch: HttpHandler) => {
  const response = await callJobsSummaryAPI(
    { spaceId, sourceId, jobTypes: metricsK8SJobTypes },
    fetch
  );
  const jobIds = Object.values(getJobIds(spaceId, sourceId));

  return response.filter((jobSummary) => jobIds.includes(jobSummary.id));
};

const getModuleDefinition = async (fetch: HttpHandler) => {
  return await callGetMlModuleAPI(moduleId, fetch);
};

const setUpModule = async (setUpModuleArgs: SetUpModuleArgs, fetch: HttpHandler) => {
  const {
    start,
    end,
    filter,
    moduleSourceConfiguration: { spaceId, sourceId, indices },
    partitionField,
  } = setUpModuleArgs;

  const indexNamePattern = indices.join(',');
  const jobIds: JobType[] = ['k8s_memory_usage', 'k8s_network_in', 'k8s_network_out'];
  const jobOverrides = jobIds.map((id) => {
    const { job: defaultJobConfig } = getDefaultJobConfigs(id);

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const analysis_config: any = {
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
        time_field: TIMESTAMP_FIELD,
      },
      analysis_config,
      custom_settings: {
        metrics_source_config: {
          indexPattern: indexNamePattern,
          timestampField: TIMESTAMP_FIELD,
          bucketSpan,
        },
      },
    };
  });

  const datafeedOverrides = jobIds.map((id) => {
    const { datafeed: defaultDatafeedConfig } = getDefaultJobConfigs(id);
    const config = { ...defaultDatafeedConfig };

    if (filter) {
      const query = JSON.parse(filter);

      config.query.bool = {
        ...config.query.bool,
        ...query.bool,
      };
    }

    if (!partitionField || id === 'k8s_memory_usage') {
      // Since the host memory usage doesn't have custom aggs, we don't need to do anything to add a partition field
      return {
        ...config,
        job_id: id,
      };
    }

    // Because the ML K8s jobs ship with a default partition field of {kubernetes.namespace}, ignore that agg and wrap it in our own agg.
    const innerAggregation =
      defaultDatafeedConfig.aggregations[DEFAULT_K8S_PARTITION_FIELD].aggregations;

    // If we have a partition field, we need to change the aggregation to do a terms agg to partition the data at the top level
    const aggregations = {
      [partitionField]: {
        terms: {
          field: partitionField,
          size: 25, // 25 is arbitratry and only used to keep the number of buckets to a managable level in the event that the user choose a high cardinality partition field.
        },
        aggregations: {
          ...innerAggregation,
        },
      },
    };

    return {
      ...config,
      job_id: id,
      aggregations,
    };
  });

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
    },
    fetch
  );
};

const getDefaultJobConfigs = (jobId: JobType): { datafeed: any; job: any } => {
  switch (jobId) {
    case 'k8s_memory_usage':
      return {
        datafeed: MemoryDatafeed,
        job: MemoryJob,
      };
    case 'k8s_network_in':
      return {
        datafeed: NetworkInDatafeed,
        job: NetworkInJob,
      };
    case 'k8s_network_out':
      return {
        datafeed: NetworkOutDatafeed,
        job: NetworkOutJob,
      };
  }
};

const cleanUpModule = async (spaceId: string, sourceId: string, fetch: HttpHandler) => {
  return await cleanUpJobsAndDatafeeds(spaceId, sourceId, metricsK8SJobTypes, fetch);
};

export const metricHostsModule: ModuleDescriptor<MetricK8sJobType> = {
  moduleId,
  moduleName,
  moduleDescription,
  jobTypes: metricsK8SJobTypes,
  bucketSpan,
  getJobIds,
  getJobSummary,
  getModuleDefinition,
  setUpModule,
  cleanUpModule,
};
