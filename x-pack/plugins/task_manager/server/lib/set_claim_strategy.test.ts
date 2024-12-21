/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLAIM_STRATEGY_MGET,
  CLAIM_STRATEGY_UPDATE_BY_QUERY,
  DEFAULT_POLL_INTERVAL,
  MGET_DEFAULT_POLL_INTERVAL,
} from '../config';
import { mockLogger } from '../test_utils';
import { setClaimStrategy } from './set_claim_strategy';

const getConfigWithoutClaimStrategy = () => ({
  discovery: {
    active_nodes_lookback: '30s',
    interval: 10000,
  },
  kibanas_per_partition: 2,
  capacity: 10,
  max_attempts: 9,
  allow_reading_invalid_state: false,
  version_conflict_threshold: 80,
  monitored_aggregated_stats_refresh_rate: 60000,
  monitored_stats_health_verbose_log: {
    enabled: false,
    level: 'debug' as const,
    warn_delayed_task_start_in_seconds: 60,
  },
  monitored_stats_required_freshness: 4000,
  monitored_stats_running_average_window: 50,
  request_capacity: 1000,
  monitored_task_execution_thresholds: {
    default: {
      error_threshold: 90,
      warn_threshold: 80,
    },
    custom: {},
  },
  ephemeral_tasks: {
    enabled: true,
    request_capacity: 10,
  },
  unsafe: {
    exclude_task_types: [],
    authenticate_background_task_utilization: true,
  },
  event_loop_delay: {
    monitor: true,
    warn_threshold: 5000,
  },
  worker_utilization_running_average_window: 5,
  metrics_reset_interval: 3000,
  request_timeouts: {
    update_by_query: 1000,
  },
  poll_interval: DEFAULT_POLL_INTERVAL,
  auto_calculate_default_ech_capacity: false,
});

const logger = mockLogger();

const deploymentIdUpdateByQuery = 'd2f0e7c6bc464a9b8b16e5730b9c40f9';
const deploymentIdMget = 'ab4e88d139f93d43024837d96144e7d4';
describe('setClaimStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  for (const isServerless of [true, false]) {
    for (const isCloud of [true, false]) {
      for (const isElasticStaffOwned of [true, false]) {
        for (const deploymentId of [undefined, deploymentIdMget, deploymentIdUpdateByQuery]) {
          for (const configuredStrategy of [CLAIM_STRATEGY_MGET, CLAIM_STRATEGY_UPDATE_BY_QUERY]) {
            test(`should return config as is when claim strategy is already defined: isServerless=${isServerless}, isCloud=${isCloud}, isElasticStaffOwned=${isElasticStaffOwned}, deploymentId=${deploymentId}`, () => {
              const config = {
                ...getConfigWithoutClaimStrategy(),
                claim_strategy: configuredStrategy,
              };

              const returnedConfig = setClaimStrategy({
                config,
                logger,
                isCloud,
                isServerless,
                isElasticStaffOwned,
                deploymentId,
              });

              expect(returnedConfig).toStrictEqual(config);
              if (deploymentId) {
                expect(logger.info).toHaveBeenCalledWith(
                  `Using claim strategy ${configuredStrategy} as configured for deployment ${deploymentId}`
                );
              } else {
                expect(logger.info).toHaveBeenCalledWith(
                  `Using claim strategy ${configuredStrategy} as configured`
                );
              }
            });
          }
        }
      }
    }
  }

  for (const isCloud of [true, false]) {
    for (const isElasticStaffOwned of [true, false]) {
      for (const deploymentId of [undefined, deploymentIdMget, deploymentIdUpdateByQuery]) {
        test(`should set claim strategy to mget if in serverless: isCloud=${isCloud}, isElasticStaffOwned=${isElasticStaffOwned}, deploymentId=${deploymentId}`, () => {
          const config = getConfigWithoutClaimStrategy();
          const returnedConfig = setClaimStrategy({
            config,
            logger,
            isCloud,
            isServerless: true,
            isElasticStaffOwned,
            deploymentId,
          });

          expect(returnedConfig.claim_strategy).toBe(CLAIM_STRATEGY_MGET);
          expect(returnedConfig.poll_interval).toBe(MGET_DEFAULT_POLL_INTERVAL);

          if (deploymentId) {
            expect(logger.info).toHaveBeenCalledWith(
              `Setting claim strategy to mget for serverless deployment ${deploymentId}`
            );
          } else {
            expect(logger.info).toHaveBeenCalledWith(`Setting claim strategy to mget`);
          }
        });
      }
    }
  }

  test(`should set claim strategy to update_by_query if not cloud and not serverless`, () => {
    const config = getConfigWithoutClaimStrategy();
    const returnedConfig = setClaimStrategy({
      config,
      logger,
      isCloud: false,
      isElasticStaffOwned: false,
      isServerless: false,
    });

    expect(returnedConfig.claim_strategy).toBe(CLAIM_STRATEGY_UPDATE_BY_QUERY);
    expect(returnedConfig.poll_interval).toBe(DEFAULT_POLL_INTERVAL);

    expect(logger.info).not.toHaveBeenCalled();
  });

  test(`should honor config-provided poll_interval`, () => {
    const config = { ...getConfigWithoutClaimStrategy(), poll_interval: 120000 };
    const returnedConfig = setClaimStrategy({
      config,
      logger,
      isCloud: false,
      isElasticStaffOwned: false,
      isServerless: false,
    });

    expect(returnedConfig.claim_strategy).toBe(CLAIM_STRATEGY_UPDATE_BY_QUERY);
    expect(returnedConfig.poll_interval).toBe(120000);

    expect(logger.info).not.toHaveBeenCalled();
  });

  test(`should set claim strategy to update_by_query if cloud and not serverless with undefined deploymentId`, () => {
    const config = getConfigWithoutClaimStrategy();
    const returnedConfig = setClaimStrategy({
      config,
      logger,
      isCloud: true,
      isElasticStaffOwned: false,
      isServerless: false,
    });

    expect(returnedConfig.claim_strategy).toBe(CLAIM_STRATEGY_UPDATE_BY_QUERY);
    expect(returnedConfig.poll_interval).toBe(DEFAULT_POLL_INTERVAL);

    expect(logger.info).not.toHaveBeenCalled();
  });

  test(`should set claim strategy to update_by_query if cloud and not serverless and deploymentId does not start with a or b`, () => {
    const config = getConfigWithoutClaimStrategy();
    const returnedConfig = setClaimStrategy({
      config,
      logger,
      isCloud: true,
      isElasticStaffOwned: false,
      isServerless: false,
      deploymentId: deploymentIdUpdateByQuery,
    });

    expect(returnedConfig.claim_strategy).toBe(CLAIM_STRATEGY_UPDATE_BY_QUERY);
    expect(returnedConfig.poll_interval).toBe(DEFAULT_POLL_INTERVAL);

    expect(logger.info).toHaveBeenCalledWith(
      `Setting claim strategy to update_by_query for deployment ${deploymentIdUpdateByQuery}`
    );
  });

  test(`should set claim strategy to mget if cloud, deploymentId does not start with a or b, not serverless and isElasticStaffOwned is true`, () => {
    const config = getConfigWithoutClaimStrategy();
    const returnedConfig = setClaimStrategy({
      config,
      logger,
      isCloud: true,
      isElasticStaffOwned: true,
      isServerless: false,
      deploymentId: deploymentIdUpdateByQuery,
    });

    expect(returnedConfig.claim_strategy).toBe(CLAIM_STRATEGY_MGET);
    expect(returnedConfig.poll_interval).toBe(MGET_DEFAULT_POLL_INTERVAL);

    expect(logger.info).toHaveBeenCalledWith(
      `Setting claim strategy to mget for deployment ${deploymentIdUpdateByQuery}`
    );
  });

  test(`should set claim strategy to mget if cloud and not serverless and deploymentId starts with a or b`, () => {
    const config = getConfigWithoutClaimStrategy();
    const returnedConfig = setClaimStrategy({
      config,
      logger,
      isCloud: true,
      isElasticStaffOwned: false,
      isServerless: false,
      deploymentId: deploymentIdMget,
    });

    expect(returnedConfig.claim_strategy).toBe(CLAIM_STRATEGY_MGET);
    expect(returnedConfig.poll_interval).toBe(MGET_DEFAULT_POLL_INTERVAL);

    expect(logger.info).toHaveBeenCalledWith(
      `Setting claim strategy to mget for deployment ${deploymentIdMget}`
    );
  });
});
