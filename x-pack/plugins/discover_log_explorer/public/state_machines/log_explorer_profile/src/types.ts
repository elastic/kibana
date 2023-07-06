/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DoneInvokeEvent } from 'xstate';
import type { DatasetEncodingError, DatasetSelection } from '../../../utils/dataset_selection';

export interface WithDatasetSelection {
  datasetSelection: DatasetSelection;
}

export type DefaultLogExplorerProfileState = WithDatasetSelection;

export type LogExplorerProfileTypestate =
  | {
      value: 'uninitialized';
      context: WithDatasetSelection;
    }
  | {
      value: 'initializingFromUrl';
      context: WithDatasetSelection;
    }
  | {
      value: 'initializingDataView';
      context: WithDatasetSelection;
    }
  | {
      value: 'initialized';
      context: WithDatasetSelection;
    }
  | {
      value: 'initialized.idle';
      context: WithDatasetSelection;
    }
  | {
      value: 'initialized.updatingDataView';
      context: WithDatasetSelection;
    };

export type LogExplorerProfileContext = LogExplorerProfileTypestate['context'];

export type LogExplorerProfileStateValue = LogExplorerProfileTypestate['value'];

export type LogExplorerProfileEvent =
  | {
      type: 'UPDATE_DATASET_SELECTION';
      data: DatasetSelection;
    }
  | {
      type: 'DATASET_SELECTION_RESTORE_FAILURE';
    }
  | DoneInvokeEvent<DatasetEncodingError>
  | DoneInvokeEvent<Error>;
