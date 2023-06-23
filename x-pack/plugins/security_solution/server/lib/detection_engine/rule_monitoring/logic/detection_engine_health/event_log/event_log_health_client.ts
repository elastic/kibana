/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type {
  ClusterHealthParameters,
  ClusterHealthSnapshot,
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
import {
  getRuleHealthAggregation,
  normalizeRuleHealthAggregationResult,
} from './aggregations/health_stats_for_rule';

/**
 * Client for calculating health stats based on events in .kibana-event-log-* index.
 */
export interface IEventLogHealthClient {
  calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealth>;
  calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth>;
  calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth>;
}

type RuleHealth = Omit<RuleHealthSnapshot, 'stats_at_the_moment'>;
type SpaceHealth = Omit<SpaceHealthSnapshot, 'stats_at_the_moment'>;
type ClusterHealth = Omit<ClusterHealthSnapshot, 'stats_at_the_moment'>;

export const createEventLogHealthClient = (eventLog: IEventLogClient): IEventLogHealthClient => {
  return {
    async calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealth> {
      const { rule_id: ruleId, interval } = args;
      const soType = RULE_SAVED_OBJECT_TYPE;
      const soIds = [ruleId];
      const eventProviders = [RULE_EXECUTION_LOG_PROVIDER, ALERTING_PROVIDER];

      const kqlFilter = `${f.EVENT_PROVIDER}:${kqlOr(eventProviders)}`;
      const aggs = getRuleHealthAggregation(interval.granularity);

      const result = await eventLog.aggregateEventsBySavedObjectIds(soType, soIds, {
        start: interval.from,
        end: interval.to,
        filter: kqlFilter,
        aggs,
      });

      return normalizeRuleHealthAggregationResult(result, aggs);
    },

    async calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth> {
      const { interval } = args;
      const soType = RULE_SAVED_OBJECT_TYPE;
      const authFilter = {} as KueryNode;
      const namespaces = undefined; // means current Kibana space
      const eventProviders = [RULE_EXECUTION_LOG_PROVIDER, ALERTING_PROVIDER];

      const kqlFilter = `${f.EVENT_PROVIDER}:${kqlOr(eventProviders)}`;
      const aggs = getRuleHealthAggregation(interval.granularity);

      // TODO: https://github.com/elastic/kibana/issues/125642 Check with ResponseOps that this is correct usage of this method
      const result = await eventLog.aggregateEventsWithAuthFilter(
        soType,
        authFilter,
        {
          start: interval.from,
          end: interval.to,
          filter: kqlFilter,
          aggs,
        },
        namespaces
      );

      return normalizeRuleHealthAggregationResult(result, aggs);
    },

    async calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth> {
      // TODO: https://github.com/elastic/kibana/issues/125642 Implement
      return {
        stats_over_interval: {
          message: 'Not implemented',
        },
        history_over_interval: {
          buckets: [],
        },
        debug: {
          eventLog: {
            request: {},
            response: {},
          },
        },
      };
    },
  };
};
