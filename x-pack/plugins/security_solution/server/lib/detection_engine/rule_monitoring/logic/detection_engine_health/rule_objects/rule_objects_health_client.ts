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
  SpaceHealthParameters,
  SpaceHealthSnapshot,
} from '../../../../../../../common/detection_engine/rule_monitoring';

/**
 * Client for calculating health stats based on rule saved objects.
 */
export interface IRuleObjectsHealthClient {
  calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth>;
  calculateClusterHealth(args: ClusterHealthParameters): Promise<ClusterHealth>;
}

type SpaceHealth = Pick<SpaceHealthSnapshot, 'stats_at_the_moment' | 'debug'>;
type ClusterHealth = Pick<ClusterHealthSnapshot, 'stats_at_the_moment' | 'debug'>;

export const createRuleObjectsHealthClient = (
  rulesClient: RulesClientApi
): IRuleObjectsHealthClient => {
  return {
    async calculateSpaceHealth(args: SpaceHealthParameters): Promise<SpaceHealth> {
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
            by_status: {},
            with_exceptions: {
              total: 0,
              enabled: 0,
              disabled: 0,
            },
            with_notification_actions: {
              total: 0,
              enabled: 0,
              disabled: 0,
            },
            with_response_actions: {
              total: 0,
              enabled: 0,
              disabled: 0,
            },
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
            by_status: {},
            with_exceptions: {
              total: 0,
              enabled: 0,
              disabled: 0,
            },
            with_notification_actions: {
              total: 0,
              enabled: 0,
              disabled: 0,
            },
            with_response_actions: {
              total: 0,
              enabled: 0,
              disabled: 0,
            },
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
