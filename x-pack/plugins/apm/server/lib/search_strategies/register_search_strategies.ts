/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetup as DataPluginSetup } from 'src/plugins/data/server';

import { APM_SEARCH_STRATEGIES } from '../../../common/search_strategies/constants';

import type { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';

import { failedTransactionsCorrelationsSearchServiceProvider } from './failed_transactions_correlations';
import { latencyCorrelationsSearchServiceProvider } from './latency_correlations';
import { searchStrategyProvider } from './search_strategy_provider';

export const registerSearchStrategies = (
  registerSearchStrategy: DataPluginSetup['search']['registerSearchStrategy'],
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
) => {
  registerSearchStrategy(
    APM_SEARCH_STRATEGIES.APM_LATENCY_CORRELATIONS,
    searchStrategyProvider(
      latencyCorrelationsSearchServiceProvider,
      getApmIndices,
      includeFrozen
    )
  );

  registerSearchStrategy(
    APM_SEARCH_STRATEGIES.APM_FAILED_TRANSACTIONS_CORRELATIONS,
    searchStrategyProvider(
      failedTransactionsCorrelationsSearchServiceProvider,
      getApmIndices,
      includeFrozen
    )
  );
};
