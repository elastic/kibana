/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetSetup, FleetStart } from '@kbn/fleet-plugin/public';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudDefendPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudDefendPluginStart {}

export interface CloudDefendPluginSetupDeps {
  fleet: FleetSetup;
}
export interface CloudDefendPluginStartDeps {
  fleet: FleetStart;
}

export enum ControlResponseAction {
  'alert',
  'block',
}

export enum ControlSelectorActivity {
  'createExecutable',
  'modifyExecutable',
}

export enum ControlSelectorCondition {
  activity = 'activity',
  containerImageName = 'containerImageName',
  containerImageTag = 'containerImageTag',
  filePath = 'filePath',
  orchestratorClusterId = 'orchestratorClusterId',
  orchestratorClusterName = 'orchestratorClusterName',
  orchestratorNamespace = 'orchestratorNamespace',
  orchestratorResourceLabel = 'orchestratorResourceLabel',
  orchestratorResourceName = 'orchestratorResourceName',
  orchestratorResourceType = 'orchestratorResourceType',
  orchestratorType = 'orchestratorType',
}

export interface ControlSelector {
  name: string;
  activity?: string[];
  containerImageName?: string[];
  containerImageTag?: string[];
  filePath?: string[];
  orchestratorClusterId?: string[];
  orchestratorClusterName?: string[];
  orchestratorNamespace?: string[];
  orchestratorResourceLabel?: string[];
  orchestratorResourceName?: string[];
  orchestratorResourceType?: string[];
  orchestratorType?: string[];

  // ephemeral, used to track selector error state in UI
  hasErrors?: boolean;
}

export interface ControlResponse {
  match: ControlSelector[];
  exclude: ControlSelector[];
  actions: ControlResponseAction[];
}

interface OnChangeDeps {
  isValid: boolean;
  updatedPolicy: NewPackagePolicy;
}

export interface SettingsDeps {
  policy: NewPackagePolicy;
  onChange(opts: OnChangeDeps): void;
}

export interface ControlGeneralViewSelectorDeps {
  selector: ControlSelector;
  selectors: ControlSelector[];
  onChange(selector: ControlSelector): void;
  onRemove(selector: ControlSelector): void;
  onDuplicate(selector: ControlSelector): void;
}

export interface ControlGeneralViewResponseDeps {
  response: ControlResponse;
  selectors: ControlSelector[];
  onChange(response: ControlResponse): void;
  onRemove(response: ControlResponse): void;
  onDuplicate(response: ControlResponse): void;
}

export interface ControlFormErrorMap {
  [key: string]: string[];
}
