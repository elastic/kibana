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
  controlGroupAPI: ControlGroupAPI;
}

export interface WithControlPanels {
  controlPanels: ControlPanels;
}

export type DefaultLogExplorerProfileState = WithDatasetSelection;

export type LogExplorerProfileTypeState =
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
      value: 'initializingControlPanels';
      context: WithDatasetSelection;
    }
  | {
      value: 'initializingStateContainer';
      context: WithDatasetSelection & WithControlPanels;
    }
  | {
      value: 'initialized';
      context: WithDatasetSelection & WithControlPanels;
    }
  | {
      value: 'initialized.datasetSelection.idle';
      context: WithDatasetSelection & WithControlPanels;
    }
  | {
      value: 'initialized.datasetSelection.updatingDataView';
      context: WithDatasetSelection & WithControlPanels;
    }
  | {
      value: 'initialized.datasetSelection.updatingStateContainer';
      context: WithDatasetSelection & WithControlPanels;
    }
  | {
      value: 'initialized.controlGroups.uninitialized';
      context: WithDatasetSelection & WithControlPanels;
    }
  | {
      value: 'initialized.controlGroups.idle';
      context: WithDatasetSelection & WithControlPanelGroupAPI & WithControlPanels;
    }
  | {
      value: 'initialized.controlGroups.updatingControlPanels';
      context: WithDatasetSelection & WithControlPanelGroupAPI & WithControlPanels;
    };

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
