/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryState } from '@kbn/data-plugin/common';
import {
  LogsExplorerController,
  LogsExplorerPublicState,
  LogsExplorerPublicStateUpdate,
} from '@kbn/logs-explorer-plugin/public';

export type ObservabilityLogsExplorerContext = ObservabilityLogsExplorerTypeState['context'];

export interface CommonObservabilityLogsExplorerContext {
  initialLogsExplorerState: LogsExplorerPublicStateUpdate;
}

export interface WithLogsExplorerState {
  logsExplorerState: LogsExplorerPublicState;
}

export interface WithController {
  controller: LogsExplorerController;
}

export type ObservabilityLogsExplorerEvent =
  | {
      type: 'INITIALIZED_FROM_URL';
      stateFromUrl?: LogsExplorerPublicStateUpdate;
    }
  | {
      type: 'INITIALIZED_FROM_TIME_FILTER_SERVICE';
      time: QueryState['time'];
      refreshInterval: QueryState['refreshInterval'];
    }
  | {
      type: 'CONTROLLER_CREATED';
      controller: LogsExplorerController;
    }
  | {
      type: 'LOGS_EXPLORER_STATE_CHANGED';
      state: LogsExplorerPublicState;
    };

export type ObservabilityLogsExplorerTypeState =
  | {
      value:
        | 'uninitialized'
        | 'initializingFromUrl'
        | 'initializingFromTimeFilterService'
        | 'creatingController';
      context: CommonObservabilityLogsExplorerContext;
    }
  | {
      value: 'initialized' | { initialized: 'unknownLogsExplorerState' };
      context: CommonObservabilityLogsExplorerContext & WithController;
    }
  | {
      value: { initialized: 'validLogsExplorerState' };
      context: CommonObservabilityLogsExplorerContext & WithLogsExplorerState & WithController;
    };
