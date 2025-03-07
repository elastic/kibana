/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import {
  CLAIM_STRATEGY_MGET,
  CLAIM_STRATEGY_UPDATE_BY_QUERY,
  DEFAULT_POLL_INTERVAL,
  MGET_DEFAULT_POLL_INTERVAL,
  TaskManagerConfig,
} from '../config';

interface SetClaimStrategyOpts {
  config: TaskManagerConfig;
  deploymentId?: string;
  isServerless: boolean;
  isCloud: boolean;
  isElasticStaffOwned: boolean;
  logger: Logger;
}

export function setClaimStrategy(opts: SetClaimStrategyOpts): TaskManagerConfig {
  // if the claim strategy is already defined, return immediately
  if (opts.config.claim_strategy) {
    opts.logger.info(
      `Using claim strategy ${opts.config.claim_strategy} as configured${
        opts.deploymentId ? ` for deployment ${opts.deploymentId}` : ''
      }`
    );
    return opts.config;
  }

  if (opts.isServerless) {
    // use mget for serverless
    opts.logger.info(
      `Setting claim strategy to mget${
        opts.deploymentId ? ` for serverless deployment ${opts.deploymentId}` : ''
      }`
    );
    return {
      ...opts.config,
      claim_strategy: CLAIM_STRATEGY_MGET,
      poll_interval: MGET_DEFAULT_POLL_INTERVAL,
    };
  }

  let defaultToMget = false;

  if (opts.isCloud && !opts.isServerless && opts.deploymentId) {
    defaultToMget =
      opts.deploymentId.startsWith('a') ||
      opts.deploymentId.startsWith('b') ||
      opts.isElasticStaffOwned;
    if (defaultToMget) {
      opts.logger.info(`Setting claim strategy to mget for deployment ${opts.deploymentId}`);
    } else {
      opts.logger.info(
        `Setting claim strategy to update_by_query for deployment ${opts.deploymentId}`
      );
    }
  }

  if (defaultToMget) {
    return {
      ...opts.config,
      claim_strategy: CLAIM_STRATEGY_MGET,
      poll_interval: maybeSetDefaultInterval(opts.config, MGET_DEFAULT_POLL_INTERVAL),
    };
  }

  return {
    ...opts.config,
    claim_strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
    poll_interval: maybeSetDefaultInterval(opts.config, DEFAULT_POLL_INTERVAL),
  };
}

/**
 * If the poll interval is not overridden by the user, return the specified default.
 *
 * @param config Current config
 * @param defaultPollInterval Default to set
 */
function maybeSetDefaultInterval(config: TaskManagerConfig, defaultPollInterval: number) {
  if (config.claim_strategy) {
    return config.poll_interval;
  }

  // Our default when there's no claim_strategy is DEFAULT_POLL_INTERVAL
  if (config.poll_interval === DEFAULT_POLL_INTERVAL) {
    return defaultPollInterval;
  }

  return config.poll_interval;
}
