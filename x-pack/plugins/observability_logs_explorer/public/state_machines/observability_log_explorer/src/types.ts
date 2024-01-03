/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryState } from '@kbn/data-plugin/common';
import {
  LogExplorerController,
  LogExplorerPublicState,
  LogExplorerPublicStateUpdate,
} from '@kbn/logs-explorer-plugin/public';

export type ObservabilityLogExplorerContext = ObservabilityLogExplorerTypeState['context'];

export interface CommonObservabilityLogExplorerContext {
  initialLogExplorerState: LogExplorerPublicStateUpdate;
}

export interface WithLogExplorerState {
  logExplorerState: LogExplorerPublicState;
}

export interface WithController {
  controller: LogExplorerController;
}

export type ObservabilityLogExplorerEvent =
  | {
      type: 'INITIALIZED_FROM_URL';
      stateFromUrl?: LogExplorerPublicStateUpdate;
    }
  | {
      type: 'INITIALIZED_FROM_TIME_FILTER_SERVICE';
      time: QueryState['time'];
      refreshInterval: QueryState['refreshInterval'];
    }
  | {
      type: 'CONTROLLER_CREATED';
      controller: LogExplorerController;
    }
  | {
      type: 'LOG_EXPLORER_STATE_CHANGED';
      state: LogExplorerPublicState;
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
