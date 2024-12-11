/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { LOG_ENTRY_SEARCH_STRATEGY } from '../../../common/search_strategies/log_entries/log_entry';
import { LOG_ENTRIES_SEARCH_STRATEGY } from '../../../common/search_strategies/log_entries/log_entries';
import { logEntriesSearchStrategyProvider } from './log_entries_search_strategy';
import { logEntrySearchStrategyProvider } from './log_entry_search_strategy';
import {
  LogEntriesServiceSetupDeps,
  LogEntriesServicePluginsStartDeps,
  LogEntriesServicePluginSelfDeps,
} from './types';

export class LogEntriesService {
  public setup(
    core: CoreSetup<LogEntriesServicePluginsStartDeps, LogEntriesServicePluginSelfDeps>,
    setupDeps: LogEntriesServiceSetupDeps
  ) {
    void core.getStartServices().then(([, startDeps, selfStartDeps]) => {
      /**
       * @deprecated
       *
       * Given the deprecation of the LogStream feature, this API will not return reliable data in upcoming versions of Kibana.
       */
      setupDeps.data.search.registerSearchStrategy(
        LOG_ENTRIES_SEARCH_STRATEGY,
        logEntriesSearchStrategyProvider({ ...setupDeps, ...startDeps, ...selfStartDeps })
      );
      /**
       * @deprecated
       *
       * Given the deprecation of the LogStream feature, this API will not return reliable data in upcoming versions of Kibana.
       */
      setupDeps.data.search.registerSearchStrategy(
        LOG_ENTRY_SEARCH_STRATEGY,
        logEntrySearchStrategyProvider({ ...setupDeps, ...startDeps, ...selfStartDeps })
      );
    });
  }

  public start(_startDeps: LogEntriesServicePluginsStartDeps) {}
}
