/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { FleetSetup, FleetStart } from '@kbn/fleet-plugin/public';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { ComponentType, ReactNode } from 'react';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import type { CloudDefendRouterProps } from './application/router';
import type { CloudDefendPageId } from './common/navigation/types';

/**
 * cloud_defend plugin types
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudDefendPluginSetup {}
export interface CloudDefendPluginStart {
  /** Gets the cloud defend router component for embedding in the security solution. */
  getCloudDefendRouter(): ComponentType<CloudDefendRouterProps>;
}

export interface CloudDefendPluginSetupDeps {
  fleet: FleetSetup;
  cloud: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}
export interface CloudDefendPluginStartDeps {
  fleet: FleetStart;
  licensing: LicensingPluginStart;
  usageCollection?: UsageCollectionStart;
}

export interface CloudDefendSecuritySolutionContext {
  /** Gets the `FiltersGlobal` component for embedding a filter bar in the security solution application. */
  getFiltersGlobalComponent: () => ComponentType<{ children: ReactNode }>;
  /** Gets the `SpyRoute` component for navigation highlighting and breadcrumbs. */
  getSpyRouteComponent: () => ComponentType<{
    pageName: CloudDefendPageId;
    state?: Record<string, string | undefined>;
  }>;
}

/**
 * cloud_defend/control types
 */
export enum ControlResponseAction {
  alert = 'alert',
  block = 'block',
}

export enum ControlSelectorCondition {
  operation = 'operation',
  containerImageName = 'containerImageName',
  containerImageTag = 'containerImageTag',
  orchestratorClusterId = 'orchestratorClusterId',
  orchestratorClusterName = 'orchestratorClusterName',
  orchestratorNamespace = 'orchestratorNamespace',
  orchestratorResourceLabel = 'orchestratorResourceLabel',
  orchestratorResourceName = 'orchestratorResourceName',
  orchestratorResourceType = 'orchestratorResourceType',
  orchestratorType = 'orchestratorType',
}

export enum ControlFileSelectorCondition {
  targetFilePath = 'targetFilePath',
  ignoreVolumeFiles = 'ignoreVolumeFiles',
  ignoreVolumeMounts = 'ignoreVolumeMounts',
}

export enum ControlProcessSelectorCondition {
  processExecutable = 'processExecutable',
  processName = 'processName',
  processUserName = 'processUserName',
  processUserId = 'processUserId',
  sessionLeaderInteractive = 'sessionLeaderInteractive',
  sessionLeaderExecutable = 'sessionLeaderExecutable',
}

export enum ControlSelectorBooleanConditions {
  ignoreVolumeFiles = 'ignoreVolumeFiles',
  ignoreVolumeMounts = 'ignoreVolumeMounts',
  sessionLeaderInteractive = 'sessionLeaderInteractive',
}

export enum ControlSelectorOperation {
  createFile = 'createFile',
  modifyFile = 'modifyFile',
  deleteFile = 'deleteFile',
  createExecutable = 'createExecutable',
  modifyExecutable = 'modifyExecutable',
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

export enum TelemetryType {
  file = 'file',
  process = 'process',
}

export interface ControlSchema {
  file?: {
    selectors: ControlSelector[];
    responses: ControlResponse[];
  };
  process?: {
    selectors: ControlSelector[];
    responses: ControlResponse[];
  };
}

export interface ControlSelector {
  name: string;
  operation?: string[];
  containerImageName?: string[];
  containerImageTag?: string[];
  orchestratorClusterId?: string[];
  orchestratorClusterName?: string[];
  orchestratorNamespace?: string[];
  orchestratorResourceLabel?: string[];
  orchestratorResourceName?: string[];
  orchestratorResourceType?: string[];
  orchestratorType?: string[];

  // selector properties
  targetFilePath?: string[];
  ignoreVolumeFiles?: boolean;
  ignoreVolumeMounts?: boolean;

  // process selector properties
  processExecutable?: string[];
  processName?: string[];
  processUserName?: string[];
  processUserId?: string[];
  sessionLeaderInteractive?: string[];

  // ephemeral props (used only in UI)
  type?: TelemetryType;

  // used to track selector error state in UI
  hasErrors?: boolean;
}

export interface ControlResponse {
  match: string[];
  exclude?: string[];
  actions: ControlResponseAction[];

  // ephemeral props (used only in UI)
  type?: TelemetryType;

  // used to track response error state in UI
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
