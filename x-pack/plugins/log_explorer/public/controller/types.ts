/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DataPublicPluginStart, QueryState } from '@kbn/data-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { Observable } from 'rxjs';
import { DisplayOptions, PartialDisplayOptions } from '../../common';
import { IDatasetsClient } from '../services/datasets';
import {
  LogExplorerControllerStateMachine,
  LogExplorerControllerStateService,
} from '../state_machines/log_explorer_controller';

export interface LogExplorerController {
  actions: {};
  datasetsClient: IDatasetsClient;
  discoverServices: LogExplorerDiscoverServices;
  event$: Observable<LogExplorerPublicEvent>;
  service: LogExplorerControllerStateService;
  state$: Observable<LogExplorerPublicState>;
  stateMachine: LogExplorerControllerStateMachine;
}

export interface LogExplorerDiscoverServices {
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  urlStateStorage: IKbnUrlStateStorage;
}

export interface ControlOption {
  controlId: string;
  selectedOptions: string[];
}

// we might want to wrap this into an object that has a "state value" laster
export type LogExplorerPublicState = QueryState & DisplayOptions;
// TODO: add selection and controls
//  & {
//   controls: ControlOption[];
// };

export type LogExplorerPublicStateUpdate = QueryState & PartialDisplayOptions;

// a placeholder for now
export type LogExplorerPublicEvent = never;
