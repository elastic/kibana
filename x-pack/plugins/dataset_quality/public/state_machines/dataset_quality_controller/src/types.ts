/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface WithTableOptions {
  table: {
    page: number;
    rowsPerPage: number;
  };
}

export type DefaultDatasetQualityControllerState = WithTableOptions;

export interface DatasetQualityControllerTypeState {
  value: 'uninitialized';
  context: DefaultDatasetQualityControllerState;
}
/* 
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
    }; */

export type DatasetQualityControllerContext = DatasetQualityControllerTypeState['context'];

export interface DatasetQualityControllerEvent {
  type: 'CHANGE_PAGE';
  page: number;
}
/*
  | DoneInvokeEvent<DatasetSelection>
  | DoneInvokeEvent<ControlPanels>
  | DoneInvokeEvent<ControlGroupAPI>
  | DoneInvokeEvent<DatasetEncodingError>
  | DoneInvokeEvent<Error>;
   */
