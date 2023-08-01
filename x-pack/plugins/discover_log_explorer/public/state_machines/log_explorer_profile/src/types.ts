/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ControlGroupAPI } from '@kbn/controls-plugin/public';
import { DoneInvokeEvent } from 'xstate';
import type { DatasetEncodingError, DatasetSelection } from '../../../utils/dataset_selection';

export interface WithDatasetSelection {
  datasetSelection: DatasetSelection;
}

export interface WithControlPanelGroupAPI {
  controlGroupAPI: ControlGroupAPI | undefined;
}

export interface WithControlPanel {
  controlPanels: ControlPanels | null;
}

export type DefaultLogExplorerProfileState = WithDatasetSelection &
  WithControlPanelGroupAPI &
  WithControlPanel;

export enum LogExplorerProfileStates {
  Uninitialized = 'uninitialized',
  InitializingFromUrl = 'initializingFromUrl',
  InitializingDataView = 'initializingDataView',
  Initialized = 'initialized',
  InitializedDatasetSelectionIdle = 'initialized.datasetSelection.idle',
  InitializedDatasetSelectionUpdatingDataView = 'initialized.datasetSelection.updatingDataView',
  InitializedControlGroupsUninitialized = 'initialized.controlGroups.uninitialized',
  InitializedControlGroupsIdle = 'initialized.controlGroups.idle',
  InitializedControlGroupsUpdatingControlPanels = 'initialized.controlGroups.updatingControlPanels',
}

export interface LogExplorerProfileTypeState {
  value: LogExplorerProfileStates;
  context: DefaultLogExplorerProfileState;
}

export type LogExplorerProfileContext = LogExplorerProfileTypeState['context'];

export type LogExplorerProfileStateValue = LogExplorerProfileTypeState['value'];

export type LogExplorerProfileEvent =
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
  | DoneInvokeEvent<DatasetSelection>
  | DoneInvokeEvent<ControlPanels>
  | DoneInvokeEvent<ControlGroupAPI>
  | DoneInvokeEvent<DatasetEncodingError>
  | DoneInvokeEvent<Error>;

const PanelRT = rt.type({
  order: rt.number,
  width: rt.union([rt.literal('medium'), rt.literal('small'), rt.literal('large')]),
  grow: rt.boolean,
  type: rt.string,
  explicitInput: rt.intersection([
    rt.type({ id: rt.string }),
    rt.partial({
      dataViewId: rt.string,
      fieldName: rt.string,
      title: rt.union([rt.string, rt.undefined]),
      selectedOptions: rt.array(rt.string),
    }),
  ]),
});

export const ControlPanelRT = rt.record(rt.string, PanelRT);

export type ControlPanels = rt.TypeOf<typeof ControlPanelRT>;
