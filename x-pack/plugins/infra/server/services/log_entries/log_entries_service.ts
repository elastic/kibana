/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { LOG_ENTRY_SEARCH_STRATEGY } from '../../../common/search_strategies/log_entries/log_entry';
import { LOG_ENTRIES_SEARCH_STRATEGY } from '../../../common/search_strategies/log_entries/log_entries';
import { logEntriesSearchStrategyProvider } from './log_entries_search_strategy';
import { logEntrySearchStrategyProvider } from './log_entry_search_strategy';
import { LogEntriesServiceSetupDeps, LogEntriesServiceStartDeps } from './types';

export class LogEntriesService {
  public setup(core: CoreSetup<LogEntriesServiceStartDeps>, setupDeps: LogEntriesServiceSetupDeps) {
    core.getStartServices().then(([, startDeps]) => {
      setupDeps.data.search.registerSearchStrategy(
        LOG_ENTRIES_SEARCH_STRATEGY,
        logEntriesSearchStrategyProvider({ ...setupDeps, ...startDeps })
      );
      setupDeps.data.search.registerSearchStrategy(
        LOG_ENTRY_SEARCH_STRATEGY,
        logEntrySearchStrategyProvider({ ...setupDeps, ...startDeps })
      );
    });
  }

  public start(_startDeps: LogEntriesServiceStartDeps) {}
}
