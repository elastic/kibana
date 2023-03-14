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

// Currently we support file and process selectors (which match on their respective set of lsm hook points)
export type SelectorType = 'file' | 'process';

/*
 * 'stringArray' uses a EuiComboBox
 * 'flag' is a boolean value which is always 'true'
 * 'boolean' can be true or false
 */
export type SelectorConditionType = 'stringArray' | 'flag' | 'boolean';

export type SelectorCondition =
  | 'containerImageName'
  | 'containerImageTag'
  | 'fullContainerImageName'
  | 'orchestratorClusterId'
  | 'orchestratorClusterName'
  | 'orchestratorNamespace'
  | 'orchestratorResourceLabel'
  | 'orchestratorResourceName'
  | 'orchestratorResourceType'
  | 'orchestratorResourceLabel'
  | 'orchestratorType'
  | 'targetFilePath'
  | 'ignoreVolumeFiles'
  | 'ignoreVolumeMounts'
  | 'operation'
  | 'processExecutable'
  | 'processName'
  | 'processUserName'
  | 'processUserId'
  | 'sessionLeaderInteractive'
  | 'sessionLeaderExecutable'
  | 'operation';

export interface SelectorConditionOptions {
  type: SelectorConditionType;
  selectorType?: SelectorType;
  not?: SelectorCondition[];
  values?:
    | {
        file?: string[];
        process?: string[];
      }
    | string[];
}

export type SelectorConditionsMapProps = {
  [key in SelectorCondition]: SelectorConditionOptions;
};

// used to determine UX control and allowed values for each condition
export const SelectorConditionsMap: SelectorConditionsMapProps = {
  containerImageName: { type: 'stringArray', not: ['fullContainerImageName'] },
  containerImageTag: { type: 'stringArray' },
  fullContainerImageName: {
    type: 'stringArray',
    not: ['containerImageName'],
  },
  orchestratorClusterId: { type: 'stringArray' },
  orchestratorClusterName: { type: 'stringArray' },
  orchestratorNamespace: { type: 'stringArray' },
  orchestratorResourceLabel: { type: 'stringArray' },
  orchestratorResourceName: { type: 'stringArray' },
  orchestratorResourceType: { type: 'stringArray' },
  orchestratorType: { type: 'stringArray', values: ['kubernetes'] },
  operation: {
    type: 'stringArray',
    values: {
      file: ['createExecutable', 'modifyExecutable', 'createFile', 'modifyFile', 'deleteFile'],
      process: ['fork', 'exec'],
    },
  },
  targetFilePath: { selectorType: 'file', type: 'stringArray' },
  ignoreVolumeFiles: { selectorType: 'file', type: 'flag', not: ['ignoreVolumeMounts'] },
  ignoreVolumeMounts: { selectorType: 'file', type: 'flag', not: ['ignoreVolumeFiles'] },
  processExecutable: { selectorType: 'process', type: 'stringArray', not: ['processName'] },
  processName: { selectorType: 'process', type: 'stringArray', not: ['processExecutable'] },
  processUserName: { selectorType: 'process', type: 'stringArray' },
  processUserId: { selectorType: 'process', type: 'stringArray' },
  sessionLeaderInteractive: { selectorType: 'process', type: 'boolean' },
  sessionLeaderExecutable: { selectorType: 'process', type: 'stringArray' },
};

export type ResponseAction = 'log' | 'alert' | 'block';

export interface Selector {
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

  // non yaml fields
  type: SelectorType;
  // used to track selector error state in UI
  hasErrors?: boolean;
}

export interface Response {
  match: string[];
  exclude?: string[];
  actions: ResponseAction[];

  // non yaml fields
  type: SelectorType;
  // used to track response error state in UI
  hasErrors?: boolean;
}

export const DefaultFileSelector: Selector = {
  type: 'file',
  name: 'Untitled',
  operation: ['createExecutable', 'modifyExecutable'],
};

export const DefaultProcessSelector: Selector = {
  type: 'process',
  name: 'Untitled',
  operation: ['fork', 'exec'],
};

export const DefaultFileResponse: Response = {
  type: 'file',
  match: [],
  actions: ['alert'],
};

export const DefaultProcessResponse: Response = {
  type: 'process',
  match: [],
  actions: ['alert'],
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
  selector: Selector;
  selectors: Selector[];
  index: number;
  onChange(selector: Selector, index: number): void;
  onRemove(index: number): void;
  onDuplicate(selector: Selector): void;
}

export interface ControlGeneralViewResponseDeps {
  response: Response;
  selectors: Selector[];
  responses: Response[];
  index: number;
  onChange(response: Response, index: number): void;
  onRemove(index: number): void;
  onDuplicate(response: Response): void;
}

export interface ControlFormErrorMap {
  [key: string]: string[];
}
