/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DetectionRulesActionsTelemetry,
  getDefaultDetectionRulesActionsTelemetry,
} from '../../schemas/actions';
import { ElasticsearchClient } from '../../../../../../src/core/server';

const MAX_RESULTS_WINDOW = 10_000;

export const getRuleActionsMetrics = async (
  esClient: ElasticsearchClient,
  kibanaIndex: string,
): Promise<DetectionRulesActionsTelemetry> => {
  const ruleSearchOptions: RuleSearchParams = {
    body: { 
      query: {
        bool: {
          filter: {
            bool: {
              must: [
                {
                  term: { 'alert.consumer': 'siem' },
                },
                {
                  exist: { field: 'alert.actions' },
                }
              ],
            },
          },
        },
      },
    },
    filter_path: [],
    ignore_unavailable: true,
    index: kibanaIndex,
    size: MAX_RESULTS_WINDOW,
  };

  try {
    const { body: ruleResults } = await esClient.search<RuleSearchResult>(ruleSearchOptions);




  if (ruleResults.hits?.hits?.length > 0) {
    const ruleObjects = ruleResults.hits.hits.map((hit) => {
      const areAllActionsMuted = hit._source?.alert.muteAll;
      const actionsMuted = hit._source?.alert.mutedInstanceIds;
      const frequencyType = hit._source?.alert.notifyWhen;
      const frequency = hit._source?.alert.throttle;
      const isPrepackaged = isElasticRule()
      const actionTypes = hit._source?.actions.reduce((actions, action) => {
        return actions[action.actionTypeId]++;
      }, getDefaultDetectionRulesActionsTelemetry());
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
  } else {
    return getDefaultDetectionRulesActionsTelemetry();
  }
};
