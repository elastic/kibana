/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ControlGroupAPI } from '@kbn/controls-plugin/public';
import { QueryState, RefreshInterval, TimeRange } from '@kbn/data-plugin/common';
import { DiscoverAppState, DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { DoneInvokeEvent } from 'xstate';
import { ControlPanels, DisplayOptions } from '../../../../common';
import type { DatasetEncodingError, DatasetSelection } from '../../../../common/dataset_selection';
import { DiscoverServiceEvent } from './services/discover_service';

export interface WithDatasetSelection {
  datasetSelection: DatasetSelection;
}

export interface WithControlPanelGroupAPI {
  controlGroupAPI: ControlGroupAPI;
}

export interface WithControlPanels {
  controlPanels?: ControlPanels;
}

export type WithQueryState = QueryState;

export type WithDisplayOptions = DisplayOptions;

export interface WithDiscoverStateContainer {
  discoverStateContainer: DiscoverStateContainer;
}

export type DefaultLogExplorerControllerState = WithDatasetSelection &
  WithQueryState &
  WithDisplayOptions;

export type LogExplorerControllerTypeState =
  | {
      value: 'uninitialized';
      context: WithDatasetSelection & WithControlPanels & WithQueryState & WithDisplayOptions;
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
      type: 'RECEIVE_DISCOVER_APP_STATE';
      appState: DiscoverAppState;
    }
  | {
      type: 'RECEIVE_TIMEFILTER_TIME';
      time: TimeRange;
    }
  | {
      type: 'RECEIVE_TIMEFILTER_REFRESH_INTERVAL';
      refreshInterval: RefreshInterval;
    }
  | DoneInvokeEvent<DatasetSelection>
  | DoneInvokeEvent<ControlPanels>
  | DoneInvokeEvent<ControlGroupAPI>
  | DoneInvokeEvent<DatasetEncodingError>
  | DoneInvokeEvent<Error>
  | DiscoverServiceEvent;
