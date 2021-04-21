/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '../../../../../../src/core/server';
import {
  AlertsAggregationResponse,
  CasesSavedObject,
  DetectionRulesTypeUsage,
  DetectionRuleMetric,
  DetectionRuleAdoption,
  MlJobMetric,
} from './index';
import { SIGNALS_ID } from '../../../common/constants';
import { DatafeedStats, Job, MlPluginSetup } from '../../../../ml/server';
import { isElasticRule, RuleSearchParams, RuleSearchResult } from './detection_telemetry_helpers';

/**
 * Default detection rule usage count, split by type + elastic/custom
 */
export const initialDetectionRulesUsage: DetectionRulesTypeUsage = {
  query: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
  },
  threshold: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
  },
  eql: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
  },
  machine_learning: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
  },
  threat_match: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
  },
  elastic_total: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
  },
  custom_total: {
    enabled: 0,
    disabled: 0,
    alerts: 0,
    cases: 0,
  },
};

/* eslint-disable complexity */
export const updateDetectionRuleUsage = (
  detectionRuleMetric: DetectionRuleMetric,
  usage: DetectionRulesTypeUsage
): DetectionRulesTypeUsage => {
  let updatedUsage = usage;

  if (detectionRuleMetric.rule_type === 'query') {
    updatedUsage = {
      ...usage,
      query: {
        ...usage.query,
        enabled: detectionRuleMetric.enabled ? usage.query.enabled + 1 : usage.query.enabled,
        disabled: !detectionRuleMetric.enabled ? usage.query.disabled + 1 : usage.query.disabled,
        alerts: usage.query.alerts + detectionRuleMetric.alert_count_daily,
        cases: usage.query.cases + detectionRuleMetric.cases_count_daily,
      },
    };
  } else if (detectionRuleMetric.rule_type === 'threshold') {
    updatedUsage = {
      ...usage,
      threshold: {
        ...usage.threshold,
        enabled: detectionRuleMetric.enabled
          ? usage.threshold.enabled + 1
          : usage.threshold.enabled,
        disabled: !detectionRuleMetric.enabled
          ? usage.threshold.disabled + 1
          : usage.threshold.disabled,
        alerts: usage.threshold.alerts + detectionRuleMetric.alert_count_daily,
        cases: usage.threshold.cases + detectionRuleMetric.cases_count_daily,
      },
    };
  } else if (detectionRuleMetric.rule_type === 'eql') {
    updatedUsage = {
      ...usage,
      eql: {
        ...usage.eql,
        enabled: detectionRuleMetric.enabled ? usage.eql.enabled + 1 : usage.eql.enabled,
        disabled: !detectionRuleMetric.enabled ? usage.eql.disabled + 1 : usage.eql.disabled,
        alerts: usage.eql.alerts + detectionRuleMetric.alert_count_daily,
        cases: usage.eql.cases + detectionRuleMetric.cases_count_daily,
      },
    };
  } else if (detectionRuleMetric.rule_type === 'machine_learning') {
    updatedUsage = {
      ...usage,
      machine_learning: {
        ...usage.machine_learning,
        enabled: detectionRuleMetric.enabled
          ? usage.machine_learning.enabled + 1
          : usage.machine_learning.enabled,
        disabled: !detectionRuleMetric.enabled
          ? usage.machine_learning.disabled + 1
          : usage.machine_learning.disabled,
        alerts: usage.machine_learning.alerts + detectionRuleMetric.alert_count_daily,
        cases: usage.machine_learning.cases + detectionRuleMetric.cases_count_daily,
      },
    };
  } else if (detectionRuleMetric.rule_type === 'threat_match') {
    updatedUsage = {
      ...usage,
      threat_match: {
        ...usage.threat_match,
        enabled: detectionRuleMetric.enabled
          ? usage.threat_match.enabled + 1
          : usage.threat_match.enabled,
        disabled: !detectionRuleMetric.enabled
          ? usage.threat_match.disabled + 1
          : usage.threat_match.disabled,
        alerts: usage.threat_match.alerts + detectionRuleMetric.alert_count_daily,
        cases: usage.threat_match.cases + detectionRuleMetric.cases_count_daily,
      },
    };
  }

  if (detectionRuleMetric.elastic_rule) {
    updatedUsage = {
      ...updatedUsage,
      elastic_total: {
        ...updatedUsage.elastic_total,
        enabled: detectionRuleMetric.enabled
          ? updatedUsage.elastic_total.enabled + 1
          : updatedUsage.elastic_total.enabled,
        disabled: !detectionRuleMetric.enabled
          ? updatedUsage.elastic_total.disabled + 1
          : updatedUsage.elastic_total.disabled,
        alerts: updatedUsage.elastic_total.alerts + detectionRuleMetric.alert_count_daily,
        cases: updatedUsage.elastic_total.cases + detectionRuleMetric.cases_count_daily,
      },
    };
  } else {
    updatedUsage = {
      ...updatedUsage,
      custom_total: {
        ...updatedUsage.custom_total,
        enabled: detectionRuleMetric.enabled
          ? updatedUsage.custom_total.enabled + 1
          : updatedUsage.custom_total.enabled,
        disabled: !detectionRuleMetric.enabled
          ? updatedUsage.custom_total.disabled + 1
          : updatedUsage.custom_total.disabled,
        alerts: updatedUsage.custom_total.alerts + detectionRuleMetric.alert_count_daily,
        cases: updatedUsage.custom_total.cases + detectionRuleMetric.cases_count_daily,
      },
    };
  }

  return updatedUsage;
};

export const getDetectionRuleMetrics = async (
  kibanaIndex: string,
  signalsIndex: string,
  esClient: ElasticsearchClient,
  savedObjectClient: SavedObjectsClientContract
): Promise<DetectionRuleAdoption> => {
  let rulesUsage: DetectionRulesTypeUsage = initialDetectionRulesUsage;
  const ruleSearchOptions: RuleSearchParams = {
    body: { query: { bool: { filter: { term: { 'alert.alertTypeId': SIGNALS_ID } } } } },
    filterPath: [],
    ignoreUnavailable: true,
    index: kibanaIndex,
    size: 1,
  };

  try {
    const { body: ruleResults } = await esClient.search<RuleSearchResult>(ruleSearchOptions);
    const { body: detectionAlertsResp } = (await esClient.search({
      index: `${signalsIndex}*`,
      size: 0,
      body: {
        aggs: {
          detectionAlerts: {
            terms: { field: 'signal.rule.id.keyword' },
          },
        },
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: 'now-24h',
                    lte: 'now',
                  },
                },
              },
            ],
          },
        },
      },
    })) as { body: AlertsAggregationResponse };

    const cases = await savedObjectClient.find<CasesSavedObject>({
      type: 'cases-comments',
      fields: [],
      page: 1,
      perPage: 10_000,
      filter: 'cases-comments.attributes.type: alert',
    });

    const casesCache = cases.saved_objects.reduce((cache, { attributes: casesObject }) => {
      const ruleId = casesObject.rule.id;

      const cacheCount = cache.get(ruleId);
      if (cacheCount === undefined) {
        cache.set(ruleId, 1);
      } else {
        cache.set(ruleId, cacheCount + 1);
      }
      return cache;
    }, new Map<string, number>());

    const alertBuckets = detectionAlertsResp.aggregations?.detectionAlerts?.buckets ?? [];

    const alertsCache = new Map<string, number>();
    alertBuckets.map((bucket) => alertsCache.set(bucket.key, bucket.doc_count));

    if (ruleResults.hits?.hits?.length > 0) {
      const ruleObjects = ruleResults.hits.hits.map((hit) => {
        const ruleId = hit._id.split(':')[1];
        const isElastic = isElasticRule(hit._source?.alert.tags);
        return {
          rule_name: hit._source?.alert.name,
          rule_id: ruleId,
          rule_type: hit._source?.alert.params.type,
          rule_version: hit._source?.alert.params.version,
          enabled: hit._source?.alert.enabled,
          elastic_rule: isElastic,
          created_on: hit._source?.alert.createdAt,
          updated_on: hit._source?.alert.updatedAt,
          alert_count_daily: alertsCache.get(ruleId) || 0,
          cases_count_daily: casesCache.get(ruleId) || 0,
        } as DetectionRuleMetric;
      });

      // Only bring back rule detail on elastic prepackaged detection rules
      const elasticRuleObjects = ruleObjects.filter((hit) => hit.elastic_rule === true);

      rulesUsage = ruleObjects.reduce((usage, rule) => {
        return updateDetectionRuleUsage(rule, usage);
      }, rulesUsage);

      return {
        detection_rule_detail: elasticRuleObjects,
        detection_rule_usage: rulesUsage,
      };
    }
  } catch (e) {
    // ignore failure, usage will be zeroed
  }

  return {
    detection_rule_detail: [],
    detection_rule_usage: rulesUsage,
  };
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

      const jobDetailsCache = new Map<string, Job>();
      jobDetails.jobs.forEach((detail) => jobDetailsCache.set(detail.job_id, detail));

      const datafeedStats = await ml
        .anomalyDetectorsProvider(fakeRequest, savedObjectClient)
        .datafeedStats();

      const datafeedStatsCache = new Map<string, DatafeedStats>();
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
