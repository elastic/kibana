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

export type ObservabilityLogExplorerContext = ObservabilityLogExplorerTypeState['context'];

export interface CommonObservabilityLogExplorerContext {
  initialLogExplorerState: LogsExplorerPublicStateUpdate;
}

export interface WithLogExplorerState {
  logExplorerState: LogsExplorerPublicState;
}

export interface WithController {
  controller: LogsExplorerController;
}

export type ObservabilityLogExplorerEvent =
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
      type: 'LOG_EXPLORER_STATE_CHANGED';
      state: LogsExplorerPublicState;
    };

export type ObservabilityLogExplorerTypeState =
  | {
      value:
        | 'uninitialized'
        | 'initializingFromUrl'
        | 'initializingFromTimeFilterService'
        | 'creatingController';
      context: CommonObservabilityLogExplorerContext;
    }
  | {
      value: 'initialized' | { initialized: 'unknownLogExplorerState' };
      context: CommonObservabilityLogExplorerContext & WithController;
    }
  | {
      value: { initialized: 'validLogExplorerState' };
      context: CommonObservabilityLogExplorerContext & WithLogExplorerState & WithController;
    };
