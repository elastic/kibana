/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApplicationStart } from 'kibana/public';
import { PackageConfig } from './';

/**
 * Supported routing state for the create package config page routes
 */
export interface CreatePackageConfigRouteState {
  /** On a successful save of the package config, use navigate to the given app */
  onSaveNavigateTo?:
    | Parameters<ApplicationStart['navigateToApp']>
    | ((newPackageConfig: PackageConfig) => Parameters<ApplicationStart['navigateToApp']>);
  /** On cancel, navigate to the given app */
  onCancelNavigateTo?: Parameters<ApplicationStart['navigateToApp']>;
  /** Url to be used on cancel links */
  onCancelUrl?: string;
}

/**
 * Supported routing state for the agent config details page routes with deploy agents action
 */
export interface AgentConfigDetailsDeployAgentAction {
  /** On done, navigate to the given app */
  onDoneNavigateTo?: Parameters<ApplicationStart['navigateToApp']>;
}

/**
 * Supported routing state for the agent config details page routes with deploy agents action
 */
export interface AgentDetailsReassignConfigAction {
  /** On done, navigate to the given app */
  onDoneNavigateTo?: Parameters<ApplicationStart['navigateToApp']>;
}

/**
 * All possible Route states.
 */
export type AnyIntraAppRouteState =
  | CreatePackageConfigRouteState
  | AgentConfigDetailsDeployAgentAction
  | AgentDetailsReassignConfigAction;
