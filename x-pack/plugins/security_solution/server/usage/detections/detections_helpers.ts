/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  KibanaRequest,
  SearchResponse,
} from '../../../../../../src/core/server';
import { MlPluginSetup } from '../../../../ml/server';
import { SIGNALS_ID, INTERNAL_IMMUTABLE_KEY } from '../../../common/constants';
import { DetectionRulesUsage, MlJobsUsage, MlJobMetric } from './index';
import { isJobStarted } from '../../../common/machine_learning/helpers';
import { isSecurityJob } from '../../../common/machine_learning/is_security_job';

interface DetectionsMetric {
  isElastic: boolean;
  isEnabled: boolean;
}

interface RuleSearchBody {
  query: {
    bool: {
      filter: {
        term: { [key: string]: string };
      };
    };
  };
}
interface RuleSearchParams {
  body: RuleSearchBody;
  filterPath: string[];
  ignoreUnavailable: boolean;
  index: string;
  size: number;
}
interface RuleSearchResult {
  alert: { enabled: boolean; tags: string[] };
}

const isElasticRule = (tags: string[]) => tags.includes(`${INTERNAL_IMMUTABLE_KEY}:true`);

/**
 * Default detection rule usage count
 */
export const initialRulesUsage: DetectionRulesUsage = {
  custom: {
    enabled: 0,
    disabled: 0,
  },
  elastic: {
    enabled: 0,
    disabled: 0,
  },
};

/**
 * Default ml job usage count
 */
export const initialMlJobsUsage: MlJobsUsage = {
  custom: {
    enabled: 0,
    disabled: 0,
  },
  elastic: {
    enabled: 0,
    disabled: 0,
  },
};

const updateRulesUsage = (
  ruleMetric: DetectionsMetric,
  usage: DetectionRulesUsage
): DetectionRulesUsage => {
  const { isEnabled, isElastic } = ruleMetric;
  if (isEnabled && isElastic) {
    return {
      ...usage,
      elastic: {
        ...usage.elastic,
        enabled: usage.elastic.enabled + 1,
      },
    };
  } else if (!isEnabled && isElastic) {
    return {
      ...usage,
      elastic: {
        ...usage.elastic,
        disabled: usage.elastic.disabled + 1,
      },
    };
  } else if (isEnabled && !isElastic) {
    return {
      ...usage,
      custom: {
        ...usage.custom,
        enabled: usage.custom.enabled + 1,
      },
    };
  } else if (!isEnabled && !isElastic) {
    return {
      ...usage,
      custom: {
        ...usage.custom,
        disabled: usage.custom.disabled + 1,
      },
    };
  } else {
    return usage;
  }
};

const updateMlJobsUsage = (jobMetric: DetectionsMetric, usage: MlJobsUsage): MlJobsUsage => {
  const { isEnabled, isElastic } = jobMetric;
  if (isEnabled && isElastic) {
    return {
      ...usage,
      elastic: {
        ...usage.elastic,
        enabled: usage.elastic.enabled + 1,
      },
    };
  } else if (!isEnabled && isElastic) {
    return {
      ...usage,
      elastic: {
        ...usage.elastic,
        disabled: usage.elastic.disabled + 1,
      },
    };
  } else if (isEnabled && !isElastic) {
    return {
      ...usage,
      custom: {
        ...usage.custom,
        enabled: usage.custom.enabled + 1,
      },
    };
  } else if (!isEnabled && !isElastic) {
    return {
      ...usage,
      custom: {
        ...usage.custom,
        disabled: usage.custom.disabled + 1,
      },
    };
  } else {
    return usage;
  }
};

export const getRulesUsage = async (
  index: string,
  esClient: ElasticsearchClient
): Promise<DetectionRulesUsage> => {
  let rulesUsage: DetectionRulesUsage = initialRulesUsage;
  const ruleSearchOptions: RuleSearchParams = {
    body: { query: { bool: { filter: { term: { 'alert.alertTypeId': SIGNALS_ID } } } } },
    filterPath: ['hits.hits._source.alert.enabled', 'hits.hits._source.alert.tags'],
    ignoreUnavailable: true,
    index,
    size: 10000, // elasticsearch index.max_result_window default value
  };

  try {
    const { body: ruleResults } = await esClient.search<SearchResponse<RuleSearchResult>>(
      ruleSearchOptions
    );

    if (ruleResults.hits?.hits?.length > 0) {
      rulesUsage = ruleResults.hits.hits.reduce((usage, hit) => {
        const isElastic = isElasticRule(hit._source.alert.tags);
        const isEnabled = hit._source.alert.enabled;

        return updateRulesUsage({ isElastic, isEnabled }, usage);
      }, initialRulesUsage);
    }
  } catch (e) {
    // ignore failure, usage will be zeroed
  }

  return rulesUsage;
};

export const getMlJobsUsage = async (
  ml: MlPluginSetup | undefined,
  savedObjectClient: SavedObjectsClientContract
): Promise<MlJobsUsage> => {
  let jobsUsage: MlJobsUsage = initialMlJobsUsage;

  if (ml) {
    try {
      const fakeRequest = { headers: {} } as KibanaRequest;

      const modules = await ml.modulesProvider(fakeRequest, savedObjectClient).listModules();
      const moduleJobs = modules.flatMap((module) => module.jobs);
      const jobs = await ml.jobServiceProvider(fakeRequest, savedObjectClient).jobsSummary();

      jobsUsage = jobs.filter(isSecurityJob).reduce((usage, job) => {
        const isElastic = moduleJobs.some((moduleJob) => moduleJob.id === job.id);
        const isEnabled = isJobStarted(job.jobState, job.datafeedState);

        return updateMlJobsUsage({ isElastic, isEnabled }, usage);
      }, initialMlJobsUsage);
    } catch (e) {
      // ignore failure, usage will be zeroed
    }
  }

  return jobsUsage;
};

export const getMlJobMetrics = async (
  ml: MlPluginSetup | undefined,
  savedObjectClient: SavedObjectsClientContract
): Promise<MlJobMetric[]> => {
  if (ml) {
    try {
      const fakeRequest = { headers: {} } as KibanaRequest;
      const jobsType = 'security';
      const securityJobStats = await ml
        .anomalyDetectorsProvider(fakeRequest, savedObjectClient)
        .jobStats(jobsType);

      const jobDetails = await ml
        .anomalyDetectorsProvider(fakeRequest, savedObjectClient)
        .jobs(jobsType);

      const jobDetailsCache = new Map();
      jobDetails.jobs.forEach((detail) => jobDetailsCache.set(detail.job_id, detail));

      const datafeedStats = await ml
        .anomalyDetectorsProvider(fakeRequest, savedObjectClient)
        .datafeedStats();

      const datafeedStatsCache = new Map();
      datafeedStats.datafeeds.forEach((datafeedStat) =>
        datafeedStatsCache.set(`${datafeedStat.datafeed_id}`, datafeedStat)
      );

      return securityJobStats.jobs.map((stat) => {
        const jobId = stat.job_id;
        const jobDetail = jobDetailsCache.get(stat.job_id);
        const datafeed = datafeedStatsCache.get(`datafeed-${jobId}`);

        return {
          job_id: jobId,
          open_time: stat.open_time,
          create_time: jobDetail?.create_time,
          finished_time: jobDetail?.finished_time,
          state: stat.state,
          data_counts: {
            bucket_count: stat.data_counts.bucket_count,
            empty_bucket_count: stat.data_counts.empty_bucket_count,
            input_bytes: stat.data_counts.input_bytes,
            input_record_count: stat.data_counts.input_record_count,
            last_data_time: stat.data_counts.last_data_time,
            processed_record_count: stat.data_counts.processed_record_count,
          },
          model_size_stats: {
            bucket_allocation_failures_count:
              stat.model_size_stats.bucket_allocation_failures_count,
            memory_status: stat.model_size_stats.memory_status,
            model_bytes: stat.model_size_stats.model_bytes,
            model_bytes_exceeded: stat.model_size_stats.model_bytes_exceeded,
            model_bytes_memory_limit: stat.model_size_stats.model_bytes_memory_limit,
            peak_model_bytes: stat.model_size_stats.peak_model_bytes,
          },
          timing_stats: {
            average_bucket_processing_time_ms: stat.timing_stats.average_bucket_processing_time_ms,
            bucket_count: stat.timing_stats.bucket_count,
            exponential_average_bucket_processing_time_ms:
              stat.timing_stats.exponential_average_bucket_processing_time_ms,
            exponential_average_bucket_processing_time_per_hour_ms:
              stat.timing_stats.exponential_average_bucket_processing_time_per_hour_ms,
            maximum_bucket_processing_time_ms: stat.timing_stats.maximum_bucket_processing_time_ms,
            minimum_bucket_processing_time_ms: stat.timing_stats.minimum_bucket_processing_time_ms,
            total_bucket_processing_time_ms: stat.timing_stats.total_bucket_processing_time_ms,
          },
          datafeed: {
            datafeed_id: datafeed?.datafeed_id,
            state: datafeed?.state,
            timing_stats: {
              average_search_time_per_bucket_ms:
                datafeed?.timing_stats.average_search_time_per_bucket_ms,
              bucket_count: datafeed?.timing_stats.bucket_count,
              exponential_average_search_time_per_hour_ms:
                datafeed?.timing_stats.exponential_average_search_time_per_hour_ms,
              search_count: datafeed?.timing_stats.search_count,
              total_search_time_ms: datafeed?.timing_stats.total_search_time_ms,
            },
          },
        } as MlJobMetric;
      });
    } catch (e) {
      // ignore failure, usage will be zeroed
    }
  }

  return [];
};
