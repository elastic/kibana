/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryState } from '@kbn/data-plugin/public';
import { DiscoverContainerProps } from '@kbn/discover-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { Observable } from 'rxjs';
import {
  availableControlsPanels,
  DataSourceSelectionPlain,
  DisplayOptions,
  PartialDisplayOptions,
} from '../../common';
import { IDatasetsClient } from '../services/datasets';
import {
  LogsExplorerControllerStateMachine,
  LogsExplorerControllerStateService,
} from '../state_machines/logs_explorer_controller';
import { LogsExplorerCustomizations } from '../customizations/types';

export interface LogsExplorerController {
  actions: {};
  customizations: LogsExplorerCustomizations;
  datasetsClient: IDatasetsClient;
  discoverServices: LogsExplorerDiscoverServices;
  event$: Observable<LogsExplorerPublicEvent>;
  service: LogsExplorerControllerStateService;
  state$: Observable<LogsExplorerPublicState>;
  stateMachine: LogsExplorerControllerStateMachine;
}

export type LogsExplorerDiscoverServices = Pick<
  Required<DiscoverContainerProps['overrideServices']>,
  'data' | 'filterManager' | 'timefilter' | 'uiSettings' | 'history'
> & {
  urlStateStorage: IKbnUrlStateStorage;
};

export interface OptionsListControlOption {
  type: 'options';
  selectedOptions: string[];
}

export interface OptionsListControlExists {
  type: 'exists';
}

export interface OptionsListControl {
  mode: 'include' | 'exclude';
  selection: OptionsListControlOption | OptionsListControlExists;
}

export interface ControlOptions {
  [availableControlsPanels.NAMESPACE]?: OptionsListControl;
}

// we might want to wrap this into an object that has a "state value" laster
export type LogsExplorerPublicState = QueryState &
  DisplayOptions & {
    controls: ControlOptions;
    dataSourceSelection: DataSourceSelectionPlain;
  };

export type LogsExplorerPublicStateUpdate = QueryState &
  PartialDisplayOptions & {
    controls?: ControlOptions;
    dataSourceSelection?: DataSourceSelectionPlain;
  };

export interface LogsExplorerPublicEvent {
  type: 'LOGS_EXPLORER_DATA_RECEIVED';
  payload: {
    rowCount: number;
  };
}
