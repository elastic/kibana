/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DoneInvokeEvent, Interpreter } from 'xstate';
import { DatasetEncodingError, DatasetSelection } from '../../../utils/dataset_selection';

export type LogExplorerProfileState = LogExplorerProfileContextWithTargetPosition &
  LogExplorerProfileContextWithLatestPosition &
  LogExplorerProfileContextWithVisiblePositions;

export type LogExplorerProfileTypestate =
  | {
      value: 'uninitialized';
      context: LogExplorerProfileState;
    }
  | {
      value: 'initializingFromUrl';
      context: LogExplorerProfileState;
    }
  | {
      value: 'creatingDataView';
      context: LogExplorerProfileState;
    }
  | {
      value: 'syncingUrlState';
      context: LogExplorerProfileState;
    }
  | {
      value: 'initialized';
      context: LogExplorerProfileState;
    };

export type LogExplorerProfileContext = LogExplorerProfileTypestate['context'];

export type LogExplorerProfileEvent =
  | {
      type: 'UPDATE_DATASET_SELECTION';
      data: DatasetSelection;
    }
  | DoneInvokeEvent<DatasetSelection>
  | DoneInvokeEvent<DatasetEncodingError>
  | DoneInvokeEvent<Error>;

export type LogExplorerProfileStateService = Interpreter<
  LogExplorerProfileState,
  any,
  LogExplorerProfileEvent,
  LogExplorerProfileTypestate
>;
