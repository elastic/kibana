/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '../../../../../../src/core/server';
import { SIGNALS_ID } from '../../../common/constants';
import { isElasticRule } from './index';
import {
  AlertsAggregationResponse,
  CasesSavedObject,
  DetectionRulesTypeUsage,
  DetectionRuleMetric,
  DetectionRuleAdoption,
  RuleSearchParams,
  RuleSearchResult,
} from './types';

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
        cases: usage.query.cases + detectionRuleMetric.cases_count_total,
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
        cases: usage.threshold.cases + detectionRuleMetric.cases_count_total,
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
        cases: usage.eql.cases + detectionRuleMetric.cases_count_total,
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
        cases: usage.machine_learning.cases + detectionRuleMetric.cases_count_total,
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
        cases: usage.threat_match.cases + detectionRuleMetric.cases_count_total,
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
        cases: updatedUsage.elastic_total.cases + detectionRuleMetric.cases_count_total,
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
        cases: updatedUsage.custom_total.cases + detectionRuleMetric.cases_count_total,
      },
    };
  }

  return updatedUsage;
};

const MAX_RESULTS_WINDOW = 10_000; // elasticsearch index.max_result_window default value

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
    size: MAX_RESULTS_WINDOW,
  };

  try {
    const { body: ruleResults } = await esClient.search<RuleSearchResult>(ruleSearchOptions);
    const { body: detectionAlertsResp } = (await esClient.search({
      index: `${signalsIndex}*`,
      size: MAX_RESULTS_WINDOW,
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
      perPage: MAX_RESULTS_WINDOW,
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
          cases_count_total: casesCache.get(ruleId) || 0,
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
