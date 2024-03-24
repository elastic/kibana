/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { validateHealthInterval } from '../detection_engine_health/health_interval';
import type { IDetectionEngineHealthClient } from '../../logic/detection_engine_health';
import type {
  ClusterHealthState,
  ClusterHealthStats,
  HealthHistory,
  HealthIntervalParameters,
  Percentiles,
  RuleInfoWithPercentiles,
  TotalEnabledDisabled,
} from '../../../../../../common/api/detection_engine';

export async function prepareAiReadyRuleMonitoringStats(
  healthClient: IDetectionEngineHealthClient,
  interval?: HealthIntervalParameters,
  onlyBasicStats = false
): Promise<string> {
  const now = moment();
  const validatedInterval = validateHealthInterval(interval, now);
  const clusterHealth = await healthClient.calculateClusterHealth({
    interval: validatedInterval,
    num_of_top_rules: 10,
  });

  const result = [
    'All delays and durations are given in ms if units are not specified.',
    `Cluster state at the current moment: ${prepareStateAtTheMoment(
      clusterHealth.state_at_the_moment
    )}`,
    `Cluster state over interval from ${validatedInterval.from} to ${
      validatedInterval.to
    }: ${prepareStatsOverInterval(clusterHealth.stats_over_interval)}`,
  ];

  if (!onlyBasicStats) {
    result.push(
      `Cluster state history over interval from ${validatedInterval.from} to ${
        validatedInterval.to
      } with ${validatedInterval.granularity} granularity: ${prepareStatsHistoryOverInterval(
        clusterHealth.history_over_interval
      )}`
    );
  }

  return result.join('\n');
}

function prepareStateAtTheMoment(state: ClusterHealthState): string {
  const numberOfRules = state.number_of_rules;

  return [
    `Number of Security rules: all ${prepareTotalEnabledDisabled(numberOfRules.all)}`,
    `prebuilt ${prepareTotalEnabledDisabled(numberOfRules.by_origin.prebuilt)}`,
    `custom ${prepareTotalEnabledDisabled(numberOfRules.by_origin.custom)}`,
    `EQL ${prepareTotalEnabledDisabled(numberOfRules.by_type['siem.eqlRule'])}`,
    `Query ${prepareTotalEnabledDisabled(numberOfRules.by_type['siem.queryRule'])}`,
    `ML ${prepareTotalEnabledDisabled(numberOfRules.by_type['siem.mlRule'])}`,
    `New Terms ${prepareTotalEnabledDisabled(numberOfRules.by_type['siem.newTermsRule'])}`,
    `Threshold ${prepareTotalEnabledDisabled(numberOfRules.by_type['siem.thresholdRule'])}`,
    `Indicator Match ${prepareTotalEnabledDisabled(numberOfRules.by_type['siem.indicatorRule'])}`,
    `succeeded ${prepareTotalEnabledDisabled(numberOfRules.by_outcome.succeeded)}`,
    `with warning ${prepareTotalEnabledDisabled(numberOfRules.by_outcome.warning)}`,
    `failed ${prepareTotalEnabledDisabled(numberOfRules.by_outcome.failed)}`,
  ].join(',');
}

function prepareTotalEnabledDisabled(ted: TotalEnabledDisabled): string {
  return `(total:${ted.total},enabled:${ted.enabled},disabled:${ted.disabled})`;
}

function prepareStatsOverInterval(stats: ClusterHealthStats): string {
  const topRules = [
    `by execution duration [${stats.top_rules.by_execution_duration_ms.map(prepareRuleInfo)}]`,
    `by schedule delay [${stats.top_rules.by_schedule_delay_ms.map(prepareRuleInfo).join(',')}]`,
    `by search duration [${stats.top_rules.by_search_duration_ms.map(prepareRuleInfo).join(',')}]`,
    `by indexing duration [${stats.top_rules.by_indexing_duration_ms
      .map(prepareRuleInfo)
      .join(',')}]`,
    `by enrichment duration [${stats.top_rules.by_enrichment_duration_ms
      .map(prepareRuleInfo)
      .join(',')}]`,
  ].join(',');

  const numOfExecutions = [
    `total:${stats.number_of_executions.total}`,
    `succeeded:${stats.number_of_executions.by_outcome.succeeded}`,
    `warning:${stats.number_of_executions.by_outcome.warning}`,
    `failed:${stats.number_of_executions.by_outcome.failed}`,
  ].join(',');
  const numOfLoggedMessaged = [
    `total:${stats.number_of_logged_messages.total}`,
    (Object.keys(stats.number_of_logged_messages.by_level) as LogLevel[]).map(
      (key) => `${key}:${stats.number_of_logged_messages.by_level[key]}`
    ),
  ].join(',');
  const numOfDetectedGaps = [
    `total:${stats.number_of_detected_gaps.total}`,
    `total duration sec:${stats.number_of_detected_gaps.total_duration_s}`,
  ];
  const executionDuration = `percentiles:${preparePercentiles(
    stats.execution_duration_ms.percentiles
  )}`;
  const scheduleDelay = `percentiles:${preparePercentiles(stats.schedule_delay_ms.percentiles)}`;
  const searchDuration = `percentiles:${preparePercentiles(stats.search_duration_ms.percentiles)}`;
  const indexingDuration = `percentiles:${preparePercentiles(
    stats.indexing_duration_ms.percentiles
  )}`;

  const topErrors = (stats.top_errors ?? []).map((x) => `count:${x.count},message:${x.message}`);
  const topWarnings = (stats.top_warnings ?? []).map(
    (x) => `count:${x.count},message:${x.message}`
  );

  return [
    `Top rules: (${topRules})`,
    `Number of executions: (${numOfExecutions})`,
    `Number of logged messages: (${numOfLoggedMessaged})`,
    `Number of detected gaps: (${numOfDetectedGaps})`,
    `Execution duration: (${executionDuration})`,
    `Schedule delay: (${scheduleDelay})`,
    `Search duration: (${searchDuration})`,
    `Indexing duration: (${indexingDuration})`,
    ...(topErrors ? [`Top errors: (${topErrors})`] : []),
    ...(topWarnings ? [`Top warning: (${topWarnings})`] : []),
  ].join(';');
}

function prepareStatsHistoryOverInterval(
  statsHistory: HealthHistory<ClusterHealthStats>,
  topRulesLimit = 2
): string {
  return statsHistory.buckets
    .map((bucket) => {
      const limitedTopRules = { ...bucket.stats.top_rules };
      const metrics = Object.keys(limitedTopRules) as Array<keyof typeof limitedTopRules>;

      for (const metric of metrics) {
        limitedTopRules[metric] = limitedTopRules[metric].slice(0, topRulesLimit);
      }

      bucket.stats.top_rules = {
        by_execution_duration_ms: bucket.stats.top_rules.by_execution_duration_ms.slice(0, 2),
        by_schedule_delay_ms: bucket.stats.top_rules.by_schedule_delay_ms.slice(0, 2),
        by_search_duration_ms: bucket.stats.top_rules.by_search_duration_ms.slice(0, 2),
        by_indexing_duration_ms: bucket.stats.top_rules.by_indexing_duration_ms.slice(0, 2),
        by_enrichment_duration_ms: bucket.stats.top_rules.by_enrichment_duration_ms.slice(0, 2),
      };

      return `(timestamp:${bucket.timestamp},stats:${prepareStatsOverInterval({
        ...bucket.stats,
        top_rules: limitedTopRules,
      })})`;
    })
    .join(';');
}

function prepareRuleInfo(ruleInfo: RuleInfoWithPercentiles): string {
  return `(id:${ruleInfo.id},name:${ruleInfo.name},type:${
    RULE_CATEGORY_TO_TYPE_MAP[ruleInfo.category]
  },percentiles:${preparePercentiles(ruleInfo.percentiles)})`;
}

function preparePercentiles(percentiles: Percentiles<number>): string {
  return Object.keys(percentiles)
    .map((key) => `${key}:${percentiles[key]}`)
    .join(',');
}

const RULE_CATEGORY_TO_TYPE_MAP: Record<string, string> = {
  'siem.eqlRule': 'EQL',
  'siem.queryRule': 'Query',
  'siem.mlRule': 'ML',
  'siem.newTermsRule': 'New Terms',
  'siem.thresholdRule': 'Threshold',
  'siem.indicatorRule': 'Indicator Match',
};
