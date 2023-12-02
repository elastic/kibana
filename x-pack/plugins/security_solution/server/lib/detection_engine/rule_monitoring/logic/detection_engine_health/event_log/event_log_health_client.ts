/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type {
  ClusterHealthParameters,
  ClusterHealthSnapshot,
  HealthInterval,
  RuleHealthParameters,
  RuleHealthSnapshot,
  SpaceHealthParameters,
  SpaceHealthSnapshot,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';

import * as f from '../../event_log/event_log_fields';
import {
  ALERTING_PROVIDER,
  RULE_EXECUTION_LOG_PROVIDER,
  RULE_SAVED_OBJECT_TYPE,
} from '../../event_log/event_log_constants';
import { kqlOr } from '../../utils/kql';
import type { IRuleSpacesClient } from '../rule_spaces/rule_spaces_client';
import {
  getRuleHealthAggregation,
  normalizeRuleHealthAggregationResult,
} from './aggregations/health_stats_for_rule';

/**
 * Client for calculating health stats based on events in .kibana-event-log-* index.
 */
export interface IEventLogHealthClient {
  /**
   * Returns health stats for a given rule in the current Kibana space.
   * Calculates the stats based on events in .kibana-event-log-* index.
   */
  calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealth>;

  /**
   * Returns health stats for all rules in the current Kibana space.
   * Calculates the stats based on events in .kibana-event-log-* index.
   */
  calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth>;

  /**
   * Returns health stats for all rules in all existing Kibana spaces (the whole cluster).
   * Calculates the stats based on events in .kibana-event-log-* index.
   */
  calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth>;
}

type RuleHealth = Omit<RuleHealthSnapshot, 'state_at_the_moment'>;
type SpaceHealth = Omit<SpaceHealthSnapshot, 'state_at_the_moment'>;
type ClusterHealth = Omit<ClusterHealthSnapshot, 'state_at_the_moment'>;

export const createEventLogHealthClient = (
  eventLog: IEventLogClient,
  ruleSpacesClient: IRuleSpacesClient,
  logger: Logger
): IEventLogHealthClient => {
  const EVENT_PROVIDERS = [RULE_EXECUTION_LOG_PROVIDER, ALERTING_PROVIDER];
  const EVENT_PROVIDERS_FILTER = `${f.EVENT_PROVIDER}: (${kqlOr(EVENT_PROVIDERS)})`;

  async function aggregateEventsForRules(
    ruleIds: string[],
    interval: HealthInterval,
    aggs: Record<string, estypes.AggregationsAggregationContainer>
  ) {
    const soType = RULE_SAVED_OBJECT_TYPE;
    const soIds = ruleIds;

    const result = await eventLog.aggregateEventsBySavedObjectIds(soType, soIds, {
      start: interval.from,
      end: interval.to,
      filter: EVENT_PROVIDERS_FILTER,
      aggs,
    });

    return result;
  }

  async function aggregateEventsForSpaces(
    spaceIds: string[],
    interval: HealthInterval,
    aggs: Record<string, estypes.AggregationsAggregationContainer>
  ) {
    const soType = RULE_SAVED_OBJECT_TYPE;
    const authFilter = {} as KueryNode;

    // The `aggregateEventsWithAuthFilter` method accepts "namespace ids" instead of "space ids".
    // If you have two Kibana spaces with ids ['default', 'space-x'],
    // it will only work properly if you pass [undefined, 'space-x'].
    const namespaces = spaceIds.map((spaceId) => SavedObjectsUtils.namespaceStringToId(spaceId));

    const result = await eventLog.aggregateEventsWithAuthFilter(
      soType,
      authFilter,
      {
        start: interval.from,
        end: interval.to,
        filter: EVENT_PROVIDERS_FILTER,
        aggs,
      },
      namespaces
    );

    return result;
  }

  return {
    async calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealth> {
      const { rule_id: ruleId, interval } = args;

      const aggs = getRuleHealthAggregation(interval.granularity);
      const result = await aggregateEventsForRules([ruleId], interval, aggs);
      return normalizeRuleHealthAggregationResult(result, aggs);
    },

    async calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth> {
      const { interval } = args;

      const spaceIds = [ruleSpacesClient.getCurrentSpaceId()];

      const aggs = getRuleHealthAggregation(interval.granularity);
      const result = await aggregateEventsForSpaces(spaceIds, interval, aggs);
      return normalizeRuleHealthAggregationResult(result, aggs);
    },

    async calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth> {
      const { interval } = args;

      const spaceIds = await ruleSpacesClient.getAllSpaceIds();

      const aggs = getRuleHealthAggregation(interval.granularity);
      const result = await aggregateEventsForSpaces(spaceIds, interval, aggs);
      return normalizeRuleHealthAggregationResult(result, aggs);
    },
  };
};
