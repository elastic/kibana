/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogExplorerController,
  LogExplorerControllerContext,
} from '@kbn/log-explorer-plugin/public';
import { QueryState } from '@kbn/data-plugin/common';
// import { DatasetSelectionPlain } from '@kbn/log-explorer-plugin/common';
import {
  LogExplorerPublicState,
  LogExplorerPublicStateUpdate,
} from '@kbn/log-explorer-plugin/public';
// import { UrlSchema } from './url_state_storage_service';

export type ObservabilityLogExplorerContext = ObservabilityLogExplorerTypeState['context'];

export interface CommonObservabilityLogExplorerContext {
  initialLogExplorerState: LogExplorerPublicStateUpdate;
}

interface WithLogExplorerState {
  logExplorerState: LogExplorerPublicState;
}

interface WithController {
  controller: LogExplorerController;
}

//   initialControllerState: Omit<UrlSchema, 'datasetSelection'> &
//     WithDecodedDatasetSelection &
//     WithTimeFilter;
// interface WithDecodedDatasetSelection {
//   datasetSelection?: DatasetSelectionPlain;
// }

export type ObservabilityLogExplorerEvent =
  | {
      type: 'INITIALIZED_FROM_URL';
      // stateFromUrl?: Omit<UrlSchema, 'datasetSelection'> & WithDecodedDatasetSelection;
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
      state: LogExplorerControllerContext;
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
      value: 'initialized';
      context: CommonObservabilityLogExplorerContext & WithLogExplorerState & WithController;
    };
