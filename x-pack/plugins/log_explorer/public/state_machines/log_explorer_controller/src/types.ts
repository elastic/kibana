/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ControlGroupAPI } from '@kbn/controls-plugin/public';
import { DoneInvokeEvent } from 'xstate';
import { QueryState } from '@kbn/data-plugin/common';
import { DiscoverAppState, DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { ControlPanels } from '../../../../common';
import type { DatasetEncodingError, DatasetSelection } from '../../../../common/dataset_selection';

export interface WithDatasetSelection {
  datasetSelection: DatasetSelection;
}

export interface WithControlPanelGroupAPI {
  controlGroupAPI: ControlGroupAPI;
}

export interface WithControlPanels {
  controlPanels?: ControlPanels;
}

export interface WithQueryState {
  time: QueryState['time'];
  refreshInterval: QueryState['refreshInterval'];
  query: QueryState['query'];
  filters: QueryState['filters'];
}

export interface WithDisplayOptions {
  columns: DiscoverAppState['columns'];
  grid: DiscoverAppState['grid'];
  rowHeight: DiscoverAppState['rowHeight'];
  rowsPerPage: DiscoverAppState['rowsPerPage'];
  breakdownField: DiscoverAppState['breakdownField'];
}

export interface WithDiscoverStateContainer {
  discoverStateContainer: DiscoverStateContainer;
}

export type DefaultLogExplorerControllerState = WithDatasetSelection & WithDisplayOptions;

export type LogExplorerControllerTypeState =
  | {
      value: 'uninitialized';
      context: WithDatasetSelection & WithQueryState & WithDisplayOptions & WithControlPanels;
    }
  | {
      value: 'initializingDataView';
      context: WithDatasetSelection & WithControlPanels & WithQueryState & WithDisplayOptions;
    }
  | {
      value: 'initializingControlPanels';
      context: WithDatasetSelection & WithControlPanels & WithQueryState & WithDisplayOptions;
    }
  | {
      value: 'initializingStateContainer';
      context: WithDatasetSelection & WithControlPanels & WithQueryState & WithDisplayOptions;
    }
  | {
      value: 'initialized';
      context: WithDatasetSelection &
        WithControlPanels &
        WithQueryState &
        WithDisplayOptions &
        WithDiscoverStateContainer;
    }
  | {
      value: 'initialized.datasetSelection.validatingSelection';
      context: WithDatasetSelection &
        WithControlPanels &
        WithQueryState &
        WithDisplayOptions &
        WithDiscoverStateContainer;
    }
  | {
      value: 'initialized.datasetSelection.idle';
      context: WithDatasetSelection &
        WithControlPanels &
        WithQueryState &
        WithDisplayOptions &
        WithDiscoverStateContainer;
    }
  | {
      value: 'initialized.datasetSelection.updatingDataView';
      context: WithDatasetSelection &
        WithControlPanels &
        WithQueryState &
        WithDisplayOptions &
        WithDiscoverStateContainer;
    }
  | {
      value: 'initialized.datasetSelection.updatingStateContainer';
      context: WithDatasetSelection &
        WithControlPanels &
        WithQueryState &
        WithDisplayOptions &
        WithDiscoverStateContainer;
    }
  | {
      value: 'initialized.controlGroups.uninitialized';
      context: WithDatasetSelection &
        WithControlPanels &
        WithQueryState &
        WithDisplayOptions &
        WithDiscoverStateContainer;
    }
  | {
      value: 'initialized.controlGroups.idle';
      context: WithDatasetSelection &
        WithControlPanelGroupAPI &
        WithControlPanels &
        WithQueryState &
        WithDisplayOptions &
        WithDiscoverStateContainer;
    }
  | {
      value: 'initialized.controlGroups.updatingControlPanels';
      context: WithDatasetSelection &
        WithControlPanelGroupAPI &
        WithControlPanels &
        WithQueryState &
        WithDisplayOptions &
        WithDiscoverStateContainer;
    };

export type LogExplorerControllerContext = LogExplorerControllerTypeState['context'];

export type LogExplorerControllerStateValue = LogExplorerControllerTypeState['value'];

export type LogExplorerControllerEvent =
  | {
      type: 'RECEIVED_STATE_CONTAINER';
      discoverStateContainer: DiscoverStateContainer;
    }
  | {
      type: 'LISTEN_TO_CHANGES';
    }
  | {
      type: 'UPDATE_DATASET_SELECTION';
      data: DatasetSelection;
    }
  | {
      type: 'DATASET_SELECTION_RESTORE_FAILURE';
    }
  | {
      type: 'INITIALIZE_CONTROL_GROUP_API';
      controlGroupAPI: ControlGroupAPI | undefined;
    }
  | {
      type: 'UPDATE_CONTROL_PANELS';
      controlPanels: ControlPanels | null;
    }
  | {
      type: 'UPDATE_CONTEXT_FROM_STATE_STORAGE_CONTAINER';
      contextUpdates: Partial<LogExplorerControllerContext>;
    }
  | DoneInvokeEvent<DatasetSelection>
  | DoneInvokeEvent<ControlPanels>
  | DoneInvokeEvent<ControlGroupAPI>
  | DoneInvokeEvent<DatasetEncodingError>
  | DoneInvokeEvent<Error>;
