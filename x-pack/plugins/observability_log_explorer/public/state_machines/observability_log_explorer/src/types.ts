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
import { DatasetSelectionPlain } from '@kbn/log-explorer-plugin/common';
import { UrlSchema } from './url_state_storage_service';

export type ObservabilityLogExplorerContext = ObservabilityLogExplorerTypeState['context'];

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DefaultObservabilityLogExplorerContext {}

interface WithController {
  controller: LogExplorerController;
}

interface WithTimeFilter {
  time: QueryState['time'];
  refreshInterval: QueryState['refreshInterval'];
}

interface WithInitialState {
  initialControllerState: Omit<UrlSchema, 'datasetSelection'> &
    WithDecodedDatasetSelection &
    WithTimeFilter;
}
interface WithDecodedDatasetSelection {
  datasetSelection?: DatasetSelectionPlain;
}

export type ObservabilityLogExplorerEvent =
  | {
      type: 'INITIALIZED_FROM_URL';
      stateFromUrl?: Omit<UrlSchema, 'datasetSelection'> & WithDecodedDatasetSelection;
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
      value: 'uninitialized';
      context: DefaultObservabilityLogExplorerContext;
    }
  | {
      value: 'initialized';
      context: WithInitialState & WithController;
    };
