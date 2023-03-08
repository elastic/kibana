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

/*
 * 'stringArray' uses a EuiComboBox
 * 'flag' is a boolean value which is always 'true'
 * 'boolean' can be true or false
 */
export type SelectorConditionType = 'stringArray' | 'flag' | 'boolean';

export type CommonSelectorCondition =
  | 'containerImageName'
  | 'containerImageTag'
  | 'orchestratorClusterId'
  | 'orchestratorClusterName'
  | 'orchestratorNamespace'
  | 'orchestratorResourceLabel'
  | 'orchestratorResourceName'
  | 'orchestratorResourceType'
  | 'orchestratorResourceLabel'
  | 'orchestratorType';

export type FileSelectorCondition =
  | 'targetFilePath'
  | 'ignoreVolumeFiles'
  | 'ignoreVolumeMounts'
  | 'operation';

export type ProcessSelectorCondition =
  | 'processExecutable'
  | 'processName'
  | 'processUserName'
  | 'processUserId'
  | 'sessionLeaderInteractive'
  | 'sessionLeaderExecutable'
  | 'operation';

export type SelectorCondition =
  | CommonSelectorCondition
  | FileSelectorCondition
  | ProcessSelectorCondition;

interface SelectorConditionsMapProps {
  common: {
    [key in CommonSelectorCondition]: {
      type: SelectorConditionType;
      values?: string[];
    };
  };
  file: {
    [key in FileSelectorCondition]: {
      type: SelectorConditionType;
      values?: string[];
    };
  };
  process: {
    [key in ProcessSelectorCondition]: {
      type: SelectorConditionType;
      values?: string[];
    };
  };
}

// used to determine UX control and allowed values for each condition
export const SelectorConditionsMap: SelectorConditionsMapProps = {
  common: {
    containerImageName: { type: 'stringArray' },
    containerImageTag: { type: 'stringArray' },
    orchestratorClusterId: { type: 'stringArray' },
    orchestratorClusterName: { type: 'stringArray' },
    orchestratorNamespace: { type: 'stringArray' },
    orchestratorResourceLabel: { type: 'stringArray' },
    orchestratorResourceName: { type: 'stringArray' },
    orchestratorResourceType: { type: 'stringArray' },
    orchestratorType: { type: 'stringArray', values: ['kubernetes'] },
  },
  file: {
    operation: {
      type: 'stringArray',
      values: ['createExecutable', 'modifyExecutable', 'createFile', 'modifyFile', 'deleteFile'],
    },
    targetFilePath: { type: 'stringArray' },
    ignoreVolumeFiles: { type: 'flag' },
    ignoreVolumeMounts: { type: 'flag' },
  },
  process: {
    operation: { type: 'stringArray', values: ['fork', 'exec'] },
    processExecutable: { type: 'stringArray' },
    processName: { type: 'stringArray' },
    processUserName: { type: 'stringArray' },
    processUserId: { type: 'stringArray' },
    sessionLeaderInteractive: { type: 'boolean' },
    sessionLeaderExecutable: { type: 'stringArray' },
  },
};

export enum ControlResponseAction {
  log = 'log',
  alert = 'alert',
  block = 'block',
}

// every selector/response has a type, currently we support file and process selectors (which match on their respective telemetry/operations)
export enum SelectorType {
  file = 'file',
  process = 'process',
}

// outer most wrapper of the yaml configuration fed to cloud-defend agent.
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
  type?: SelectorType;

  // used to track selector error state in UI
  hasErrors?: boolean;
}

export interface ControlResponse {
  match: string[];
  exclude?: string[];
  actions: ControlResponseAction[];

  // ephemeral props (used only in UI)
  type?: SelectorType;

  // used to track response error state in UI
  hasErrors?: boolean;
}

export const DefaultFileSelector: ControlSelector = {
  name: 'Untitled',
  operation: ['createExecutable', 'modifyExecutable'],
};

export const DefaultProcessSelector: ControlSelector = {
  name: 'Untitled',
  operation: ['fork', 'exec'],
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
