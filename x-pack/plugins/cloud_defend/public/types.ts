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
  alert = 'alert',
  block = 'block',
}

export enum ControlSelectorCondition {
  operation = 'operation',
  containerImageName = 'containerImageName',
  containerImageTag = 'containerImageTag',
  targetFilePath = 'targetFilePath',
  orchestratorClusterId = 'orchestratorClusterId',
  orchestratorClusterName = 'orchestratorClusterName',
  orchestratorNamespace = 'orchestratorNamespace',
  orchestratorResourceLabel = 'orchestratorResourceLabel',
  orchestratorResourceName = 'orchestratorResourceName',
  orchestratorResourceType = 'orchestratorResourceType',
  orchestratorType = 'orchestratorType',
}

export enum ControlSelectorOperation {
  createExecutable = 'createExecutable',
  modifyExecutable = 'modifyExecutable',
  execMemFd = 'execMemFd',
}

export enum ControlSelectorOrchestratorType {
  kubernetes = 'kubernetes',
}

export interface ControlSelectorConditionUIOptions {
  [key: string]: {
    values: string[];
  };
}

export const ControlSelectorConditionUIOptionsMap: ControlSelectorConditionUIOptions = {
  operation: { values: Object.values(ControlSelectorOperation) },
  orchestratorType: { values: Object.values(ControlSelectorOrchestratorType) },
};

export interface ControlSelector {
  name: string;
  operation?: string[];
  containerImageName?: string[];
  containerImageTag?: string[];
  targetFilePath?: string[];
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
  match: string[];
  exclude?: string[];
  actions: ControlResponseAction[];

  // ephemeral, used to track response error state in UI
  hasErrors?: boolean;
}

export const DefaultSelector: ControlSelector = {
  name: 'Untitled',
  operation: ControlSelectorConditionUIOptionsMap.operation.values,
};

export const DefaultResponse: ControlResponse = {
  match: [],
  actions: [ControlResponseAction.alert],
};

export interface OnChangeDeps {
  isValid: boolean;
  updatedPolicy: NewPackagePolicy;
}

export interface SettingsDeps {
  policy: NewPackagePolicy;
  onChange(opts: OnChangeDeps): void;
}

export interface ViewDeps extends SettingsDeps {
  show: boolean;
}

export interface ControlGeneralViewSelectorDeps {
  selector: ControlSelector;
  selectors: ControlSelector[];
  index: number;
  onChange(selector: ControlSelector, index: number): void;
  onRemove(index: number): void;
  onDuplicate(selector: ControlSelector): void;
}

export interface ControlGeneralViewResponseDeps {
  response: ControlResponse;
  selectors: ControlSelector[];
  responses: ControlResponse[];
  index: number;
  onChange(response: ControlResponse, index: number): void;
  onRemove(index: number): void;
  onDuplicate(response: ControlResponse): void;
}

export interface ControlFormErrorMap {
  [key: string]: string[];
}
