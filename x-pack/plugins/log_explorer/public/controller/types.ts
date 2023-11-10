/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { Observable } from 'rxjs';
import { IDatasetsClient } from '../services/datasets';
import {
  LogExplorerControllerContext,
  LogExplorerControllerStateMachine,
  LogExplorerControllerStateService,
} from '../state_machines/log_explorer_controller';

export interface LogExplorerController {
  datasetsClient: IDatasetsClient;
  discoverServices: LogExplorerDiscoverServices;
  service: LogExplorerControllerStateService;
  state$: Observable<LogExplorerControllerContext>;
  stateMachine: LogExplorerControllerStateMachine;
}

export interface LogExplorerDiscoverServices {
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  urlStateStorage: IKbnUrlStateStorage;
}
