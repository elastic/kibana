/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsSingleMetricAggregateBase,
  AggregationsCardinalityAggregate,
  AggregationsTermsAggregateBase,
  AggregationsStringTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

import {
  ConnectorsByConsumersBucket,
  groupConnectorsByConsumers,
} from './group_connectors_by_consumers';
import { groupRulesByNotifyWhen } from './group_rules_by_notify_when';
import { groupRulesByStatus } from './group_rules_by_status';
import { AlertingUsage } from '../types';
import { NUM_ALERTING_RULE_TYPES } from '../alerting_usage_collector';
import { parseSimpleRuleTypeBucket } from './parse_simple_rule_type_bucket';

interface Opts {
  esClient: ElasticsearchClient;
  kibanaIndex: string;
  logger: Logger;
}

type GetTotalCountsResults = Pick<
  AlertingUsage,
  | 'count_total'
  | 'count_by_type'
  | 'count_rules_by_execution_status'
  | 'count_rules_by_notify_when'
  | 'count_rules_with_tags'
  | 'count_rules_snoozed'
  | 'count_rules_muted'
  | 'count_rules_with_muted_alerts'
  | 'count_connector_types_by_consumers'
  | 'throttle_time'
  | 'schedule_time'
  | 'throttle_time_number_s'
  | 'schedule_time_number_s'
  | 'connectors_per_alert'
> & { errorMessage?: string; hasErrors: boolean };

interface GetTotalCountInUseResults {
  countTotal: number;
  countByType: Record<string, number>;
  countNamespaces: number;
  errorMessage?: string;
  hasErrors: boolean;
}

export async function getTotalCountAggregations({
  esClient,
  kibanaIndex,
  logger,
}: Opts): Promise<GetTotalCountsResults> {
  try {
    const query = {
      index: kibanaIndex,
      size: 0,
      body: {
        query: {
          bool: {
            // Aggregate over all rule saved objects
            filter: [{ term: { type: 'alert' } }],
          },
        },
        runtime_mappings: {
          rule_action_count: {
            type: 'long',
            script: {
              source: `
                def alert = params._source['alert'];
                if (alert != null) {
                  def actions = alert.actions;
                  if (actions != null) {
                    emit(actions.length);
                  } else {
                    emit(0);
                  }
                }`,
            },
          },
          // Convert schedule interval duration string from rule saved object to interval in seconds
          rule_schedule_interval: {
            type: 'long',
            script: {
              source: `
                int parsed = 0;
                if (doc['alert.schedule.interval'].size() > 0) {
                  def interval = doc['alert.schedule.interval'].value;

                  if (interval.length() > 1) {
                      // get last char
                      String timeChar = interval.substring(interval.length() - 1);
                      // remove last char
                      interval = interval.substring(0, interval.length() - 1);

                      if (interval.chars().allMatch(Character::isDigit)) {
                        // using of regex is not allowed in painless language
                        parsed = Integer.parseInt(interval);

                        if (timeChar.equals("s")) {
                          parsed = parsed;
                        } else if (timeChar.equals("m")) {
                          parsed = parsed * 60;
                        } else if (timeChar.equals("h")) {
                          parsed = parsed * 60 * 60;
                        } else if (timeChar.equals("d")) {
                          parsed = parsed * 24 * 60 * 60;
                        }
                        emit(parsed);
                      }
                  }
                }
                emit(parsed);
              `,
            },
          },
          // Convert throttle interval duration string from rule saved object to interval in seconds
          rule_throttle_interval: {
            type: 'long',
            script: {
              source: `
                int parsed = 0;
                if (doc['alert.throttle'].size() > 0) {
                def throttle = doc['alert.throttle'].value;

                if (throttle.length() > 1) {
                    // get last char
                    String timeChar = throttle.substring(throttle.length() - 1);
                    // remove last char
                    throttle = throttle.substring(0, throttle.length() - 1);

                    if (throttle.chars().allMatch(Character::isDigit)) {
                      // using of regex is not allowed in painless language
                      parsed = Integer.parseInt(throttle);

                      if (timeChar.equals("s")) {
                        parsed = parsed;
                      } else if (timeChar.equals("m")) {
                        parsed = parsed * 60;
                      } else if (timeChar.equals("h")) {
                        parsed = parsed * 60 * 60;
                      } else if (timeChar.equals("d")) {
                        parsed = parsed * 24 * 60 * 60;
                      }
                      emit(parsed);
                    }
                }
              }
              emit(parsed);
              `,
            },
          },
          rule_with_tags: {
            type: 'long',
            script: {
              source: `
               def rule = params._source['alert'];
                if (rule != null && rule.tags != null) {
                  if (rule.tags.size() > 0) {
                    emit(1);
                  } else {
                    emit(0);
                  }
                }`,
            },
          },
          rule_snoozed: {
            type: 'long',
            script: {
              source: `
                def rule = params._source['alert'];
                if (rule != null && rule.snoozeSchedule != null) {
                  if (rule.snoozeSchedule.size() > 0) {
                    emit(1);
                  } else {
                    emit(0);
                  }
                }`,
            },
          },
          rule_muted: {
            type: 'long',
            script: {
              source: `
                if (doc['alert.muteAll'].value == true) {
                  emit(1);
                } else {
                  emit(0);
                }`,
            },
          },
          rule_with_muted_alerts: {
            type: 'long',
            script: {
              source: `
                def rule = params._source['alert'];
                if (rule != null && rule.mutedInstanceIds != null) {
                  if (rule.mutedInstanceIds.size() > 0) {
                    emit(1);
                  } else {
                    emit(0);
                  }
                }`,
            },
          },
        },
        aggs: {
          by_rule_type_id: {
            terms: {
              field: 'alert.alertTypeId',
              size: NUM_ALERTING_RULE_TYPES,
            },
          },
          max_throttle_time: { max: { field: 'rule_throttle_interval' } },
          min_throttle_time: { min: { field: 'rule_throttle_interval' } },
          avg_throttle_time: { avg: { field: 'rule_throttle_interval' } },
          max_interval_time: { max: { field: 'rule_schedule_interval' } },
          min_interval_time: { min: { field: 'rule_schedule_interval' } },
          avg_interval_time: { avg: { field: 'rule_schedule_interval' } },
          max_actions_count: { max: { field: 'rule_action_count' } },
          min_actions_count: { min: { field: 'rule_action_count' } },
          avg_actions_count: { avg: { field: 'rule_action_count' } },
          by_execution_status: {
            terms: {
              field: 'alert.executionStatus.status',
            },
          },
          by_notify_when: {
            terms: {
              field: 'alert.notifyWhen',
            },
          },
          connector_types_by_consumers: {
            terms: {
              field: 'alert.consumer',
            },
            aggs: {
              actions: {
                nested: {
                  path: 'alert.actions',
                },
                aggs: {
                  connector_types: {
                    terms: {
                      field: 'alert.actions.actionTypeId',
                    },
                  },
                },
              },
            },
          },
          sum_rules_with_tags: { sum: { field: 'rule_with_tags' } },
          sum_rules_snoozed: { sum: { field: 'rule_snoozed' } },
          sum_rules_muted: { sum: { field: 'rule_muted' } },
          sum_rules_with_muted_alerts: { sum: { field: 'rule_with_muted_alerts' } },
        },
      },
    };

    logger.debug(`query for getTotalCountAggregations - ${JSON.stringify(query)}`);
    const results = await esClient.search(query);

    logger.debug(`results for getTotalCountAggregations query - ${JSON.stringify(results)}`);

    const aggregations = results.aggregations as {
      by_rule_type_id: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      max_throttle_time: AggregationsSingleMetricAggregateBase;
      min_throttle_time: AggregationsSingleMetricAggregateBase;
      avg_throttle_time: AggregationsSingleMetricAggregateBase;
      max_interval_time: AggregationsSingleMetricAggregateBase;
      min_interval_time: AggregationsSingleMetricAggregateBase;
      avg_interval_time: AggregationsSingleMetricAggregateBase;
      max_actions_count: AggregationsSingleMetricAggregateBase;
      min_actions_count: AggregationsSingleMetricAggregateBase;
      avg_actions_count: AggregationsSingleMetricAggregateBase;
      by_execution_status: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      by_notify_when: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      connector_types_by_consumers: AggregationsTermsAggregateBase<ConnectorsByConsumersBucket>;
      sum_rules_with_tags: AggregationsSingleMetricAggregateBase;
      sum_rules_snoozed: AggregationsSingleMetricAggregateBase;
      sum_rules_muted: AggregationsSingleMetricAggregateBase;
      sum_rules_with_muted_alerts: AggregationsSingleMetricAggregateBase;
    };

    const totalRulesCount =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    const countRulesByExecutionStatus = groupRulesByStatus(
      parseSimpleRuleTypeBucket(aggregations.by_execution_status.buckets)
    );

    const countRulesByNotifyWhen = groupRulesByNotifyWhen(
      parseSimpleRuleTypeBucket(aggregations.by_notify_when.buckets)
    );

    const countConnectorTypesByConsumers = groupConnectorsByConsumers(
      aggregations.connector_types_by_consumers.buckets
    );

    return {
      hasErrors: false,
      count_total: totalRulesCount ?? 0,
      count_by_type: parseSimpleRuleTypeBucket(aggregations.by_rule_type_id.buckets),
      count_rules_by_execution_status: countRulesByExecutionStatus,
      count_rules_with_tags: aggregations.sum_rules_with_tags.value ?? 0,
      count_rules_by_notify_when: countRulesByNotifyWhen,
      count_rules_snoozed: aggregations.sum_rules_snoozed.value ?? 0,
      count_rules_muted: aggregations.sum_rules_muted.value ?? 0,
      count_rules_with_muted_alerts: aggregations.sum_rules_with_muted_alerts.value ?? 0,
      count_connector_types_by_consumers: countConnectorTypesByConsumers,
      throttle_time: {
        min: `${aggregations.min_throttle_time.value ?? 0}s`,
        avg: `${aggregations.avg_throttle_time.value ?? 0}s`,
        max: `${aggregations.max_throttle_time.value ?? 0}s`,
      },
      schedule_time: {
        min: `${aggregations.min_interval_time.value ?? 0}s`,
        avg: `${aggregations.avg_interval_time.value ?? 0}s`,
        max: `${aggregations.max_interval_time.value ?? 0}s`,
      },
      throttle_time_number_s: {
        min: aggregations.min_throttle_time.value ?? 0,
        avg: aggregations.avg_throttle_time.value ?? 0,
        max: aggregations.max_throttle_time.value ?? 0,
      },
      schedule_time_number_s: {
        min: aggregations.min_interval_time.value ?? 0,
        avg: aggregations.avg_interval_time.value ?? 0,
        max: aggregations.max_interval_time.value ?? 0,
      },
      connectors_per_alert: {
        min: aggregations.min_actions_count.value ?? 0,
        avg: aggregations.avg_actions_count.value ?? 0,
        max: aggregations.max_actions_count.value ?? 0,
      },
    };
  } catch (err) {
    const errorMessage = err && err.message ? err.message : err.toString();

    logger.warn(
      `Error executing alerting telemetry task: getTotalCountAggregations - ${JSON.stringify(err)}`,
      {
        tags: ['alerting', 'telemetry-failed'],
        error: { stack_trace: err.stack },
      }
    );
    return {
      hasErrors: true,
      errorMessage,
      count_total: 0,
      count_by_type: {},
      count_rules_by_execution_status: { success: 0, error: 0, warning: 0 },
      count_rules_by_notify_when: {
        on_throttle_interval: 0,
        on_active_alert: 0,
        on_action_group_change: 0,
      },
      count_rules_with_tags: 0,
      count_rules_snoozed: 0,
      count_rules_muted: 0,
      count_rules_with_muted_alerts: 0,
      count_connector_types_by_consumers: {},
      throttle_time: {
        min: '0s',
        avg: '0s',
        max: '0s',
      },
      schedule_time: {
        min: '0s',
        avg: '0s',
        max: '0s',
      },
      throttle_time_number_s: {
        min: 0,
        avg: 0,
        max: 0,
      },
      schedule_time_number_s: {
        min: 0,
        avg: 0,
        max: 0,
      },
      connectors_per_alert: {
        min: 0,
        avg: 0,
        max: 0,
      },
    };
  }
}

export async function getTotalCountInUse({
  esClient,
  kibanaIndex,
  logger,
}: Opts): Promise<GetTotalCountInUseResults> {
  try {
    const query = {
      index: kibanaIndex,
      size: 0,
      body: {
        query: {
          bool: {
            // Aggregate over only enabled rule saved objects
            filter: [{ term: { type: 'alert' } }, { term: { 'alert.enabled': true } }],
          },
        },
        aggs: {
          namespaces_count: { cardinality: { field: 'namespaces' } },
          by_rule_type_id: {
            terms: {
              field: 'alert.alertTypeId',
              size: NUM_ALERTING_RULE_TYPES,
            },
          },
        },
      },
    };

    logger.debug(`query for getTotalCountInUse - ${JSON.stringify(query)}`);
    const results = await esClient.search(query);

    logger.debug(`results for getTotalCountInUse query - ${JSON.stringify(results)}`);

    const aggregations = results.aggregations as {
      by_rule_type_id: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      namespaces_count: AggregationsCardinalityAggregate;
    };

    const totalEnabledRulesCount =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    return {
      hasErrors: false,
      countTotal: totalEnabledRulesCount ?? 0,
      countByType: parseSimpleRuleTypeBucket(aggregations.by_rule_type_id.buckets),
      countNamespaces: aggregations.namespaces_count.value ?? 0,
    };
  } catch (err) {
    const errorMessage = err && err.message ? err.message : err.toString();
    logger.warn(
      `Error executing alerting telemetry task: getTotalCountInUse - ${JSON.stringify(err)}`,
      {
        tags: ['alerting', 'telemetry-failed'],
        error: { stack_trace: err.stack },
      }
    );
    return {
      hasErrors: true,
      errorMessage,
      countTotal: 0,
      countByType: {},
      countNamespaces: 0,
    };
  }
}
