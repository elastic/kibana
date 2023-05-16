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
import * as i18n from './components/control_general_view/translations';

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
  | 'containerImageFullName'
  | 'containerImageName'
  | 'containerImageTag'
  | 'kubernetesClusterId'
  | 'kubernetesClusterName'
  | 'kubernetesNamespace'
  | 'kubernetesPodLabel'
  | 'kubernetesPodName'
  | 'targetFilePath'
  | 'ignoreVolumeFiles'
  | 'ignoreVolumeMounts'
  | 'operation'
  | 'processExecutable'
  | 'processName'
  | 'sessionLeaderInteractive';

export interface SelectorConditionOptions {
  type: SelectorConditionType;
  pattern?: string;
  patternError?: string;
  selectorType?: SelectorType;
  maxValueBytes?: number; // defaults to const MAX_FILE_PATH_VALUE_LENGTH_BYTES
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
  containerImageFullName: {
    type: 'stringArray',
    pattern:
      '^(?:\\[[a-fA-F0-9:]+\\]|(?:[a-zA-Z0-9-](?:\\.[a-z0-9]+)*)+)(?::[0-9]+)?(?:\\/[a-z0-9]+)+$',
    patternError: i18n.errorInvalidFullContainerImageName,
    not: ['containerImageName'],
  },
  containerImageName: {
    type: 'stringArray',
    pattern: '^[a-z0-9]+$',
    not: ['containerImageFullName'],
  },
  containerImageTag: { type: 'stringArray' },
  kubernetesClusterId: { type: 'stringArray' },
  kubernetesClusterName: { type: 'stringArray' },
  kubernetesNamespace: { type: 'stringArray' },
  kubernetesPodName: { type: 'stringArray' },
  kubernetesPodLabel: {
    type: 'stringArray',
    pattern: '^([a-zA-Z0-9\\.\\-]+\\/)?[a-zA-Z0-9\\.\\-]+:[a-zA-Z0-9\\.\\-\\_]*\\*?$',
    patternError: i18n.errorInvalidPodLabel,
  },
  operation: {
    type: 'stringArray',
    values: {
      file: ['createExecutable', 'modifyExecutable', 'createFile', 'modifyFile', 'deleteFile'],
      process: ['fork', 'exec'],
    },
  },
  targetFilePath: {
    selectorType: 'file',
    type: 'stringArray',
    maxValueBytes: 255,
    pattern: '^(?:\\/[^\\/\\*]+)*(?:\\/\\*|\\/\\*\\*)?$',
    patternError: i18n.errorInvalidTargetFilePath,
  },
  ignoreVolumeFiles: { selectorType: 'file', type: 'flag', not: ['ignoreVolumeMounts'] },
  ignoreVolumeMounts: { selectorType: 'file', type: 'flag', not: ['ignoreVolumeFiles'] },
  processExecutable: {
    selectorType: 'process',
    type: 'stringArray',
    not: ['processName'],
    pattern: '^(?:\\/[^\\/\\*]+)*(?:\\/\\*|\\/\\*\\*)?$',
    patternError: i18n.errorInvalidProcessExecutable,
  },
  processName: {
    selectorType: 'process',
    type: 'stringArray',
    not: ['processExecutable'],
    maxValueBytes: 15,
  },
  sessionLeaderInteractive: { selectorType: 'process', type: 'boolean' },
};

export type ResponseAction = 'log' | 'alert' | 'block';

export interface Selector {
  name: string;
  operation?: string[];
  containerImageFullName?: string[];
  containerImageName?: string[];
  containerImageTag?: string[];
  kubernetesClusterId?: string[];
  kubernetesClusterName?: string[];
  kubernetesNamespace?: string[];
  kubernetesPodLabel?: string[];
  kubernetesPodName?: string[];

  // selector properties
  targetFilePath?: string[];
  ignoreVolumeFiles?: boolean;
  ignoreVolumeMounts?: boolean;

  // process selector properties
  processExecutable?: string[];
  processName?: string[];
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
  usedByResponse: boolean;
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
