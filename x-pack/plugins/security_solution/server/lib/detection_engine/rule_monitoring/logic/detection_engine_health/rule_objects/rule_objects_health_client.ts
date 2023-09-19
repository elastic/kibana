/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type {
  ClusterHealthParameters,
  ClusterHealthSnapshot,
  RuleHealthParameters,
  RuleHealthSnapshot,
  SpaceHealthParameters,
  SpaceHealthSnapshot,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  getSpaceHealthAggregation,
  normalizeSpaceHealthAggregationResult,
} from './aggregations/health_stats_for_space';
import { fetchRuleById } from './fetch_rule_by_id';

/**
 * Client for calculating health stats based on rule saved objects.
 */
export interface IRuleObjectsHealthClient {
  calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealth>;
  calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth>;
  calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth>;
}

type RuleHealth = Pick<RuleHealthSnapshot, 'stats_at_the_moment' | 'debug'>;
type SpaceHealth = Pick<SpaceHealthSnapshot, 'stats_at_the_moment' | 'debug'>;
type ClusterHealth = Pick<ClusterHealthSnapshot, 'stats_at_the_moment' | 'debug'>;

export const createRuleObjectsHealthClient = (
  rulesClient: RulesClientApi
): IRuleObjectsHealthClient => {
  return {
    async calculateRuleHealth(args: RuleHealthParameters): Promise<RuleHealth> {
      const rule = await fetchRuleById(rulesClient, args.rule_id);
      return {
        stats_at_the_moment: { rule },
        debug: {},
      };
    },

    async calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth> {
      const aggs = getSpaceHealthAggregation();
      const aggregations = await rulesClient.aggregate({ aggs });

      return {
        stats_at_the_moment: normalizeSpaceHealthAggregationResult(aggregations),
        debug: {
          rulesClient: {
            request: { aggs },
            response: { aggregations },
          },
        },
      };
    },

    async calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth> {
      // TODO: https://github.com/elastic/kibana/issues/125642 Implement
      return {
        stats_at_the_moment: {
          number_of_rules: {
            all: {
              total: 0,
              enabled: 0,
              disabled: 0,
            },
            by_origin: {
              prebuilt: {
                total: 0,
                enabled: 0,
                disabled: 0,
              },
              custom: {
                total: 0,
                enabled: 0,
                disabled: 0,
              },
            },
            by_type: {},
            by_outcome: {},
          },
        },
        debug: {
          rulesClient: {
            request: {},
            response: {},
          },
        },
      };
    },
  };
};
