/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { DoneInvokeEvent, Interpreter } from 'xstate';
import type { DatasetEncodingError, DatasetSelection } from '../../../utils/dataset_selection';

export interface WithDatasetSelection {
  datasetSelection: DatasetSelection;
}

export interface WithDataView {
  dataView: DataView;
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
      value: 'creatingDataView';
      context: WithDatasetSelection & WithDataView;
    }
  | {
      value: 'syncingUrlState';
      context: WithDatasetSelection & WithDataView;
    }
  | {
      value: 'initialized';
      context: WithDatasetSelection & WithDataView;
    };

export type LogExplorerProfileState = LogExplorerProfileTypestate['value'];
export type LogExplorerProfileContext = LogExplorerProfileTypestate['context'];

export type LogExplorerProfileEvent =
  | {
      type: 'UPDATE_DATASET_SELECTION';
      data: DatasetSelection;
    }
  | DoneInvokeEvent<DatasetSelection>
  | DoneInvokeEvent<DataView>
  | DoneInvokeEvent<DatasetEncodingError>
  | DoneInvokeEvent<Error>;
