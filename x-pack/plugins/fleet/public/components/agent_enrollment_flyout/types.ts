/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy, DownloadSource, FleetProxy } from '../../types';

import type { InstalledIntegrationPolicy } from './use_get_agent_incoming_data';

export type K8sMode =
  | 'IS_LOADING'
  | 'IS_KUBERNETES'
  | 'IS_NOT_KUBERNETES'
  | 'IS_KUBERNETES_MULTIPAGE';

export type CloudSecurityIntegrationType = 'kspm' | 'vuln_mgmt' | 'cspm';
export type CloudSecurityIntegrationAwsAccountType = 'single-account' | 'organization-account';
export type CloudSecurityIntegrationAzureAccountType = 'single-account' | 'organization-account';

export type FlyoutMode = 'managed' | 'standalone';
export type SelectionType = 'tabs' | 'radio' | undefined;

export interface CloudFormationProps {
  templateUrl: string | undefined;
  awsAccountType: CloudSecurityIntegrationAwsAccountType | undefined;
}

export interface AzureArmTemplateProps {
  templateUrl: string | undefined;
  azureAccountType: CloudSecurityIntegrationAzureAccountType | undefined;
}

export interface CloudSecurityIntegration {
  integrationType: CloudSecurityIntegrationType | undefined;
  isLoading: boolean;
  isCloudFormation: boolean;
  isAzureArmTemplate: boolean;
  cloudFormationProps?: CloudFormationProps;
  azureArmTemplateProps?: AzureArmTemplateProps;
  cloudShellUrl: string | undefined;
}

export interface BaseProps {
  /**
   * The user selected policy to be used. If this value is `undefined` a value must be provided for `agentPolicies`.
   */
  agentPolicy?: AgentPolicy;

  isFleetServerPolicySelected?: boolean;

  isK8s?: K8sMode;

  cloudSecurityIntegration?: CloudSecurityIntegration;

  /**
   * There is a step in the agent enrollment process that allows users to see the data from an integration represented in the UI
   * in some way. This is an area for consumers to render a button and text explaining how data can be viewed.
   */
  isIntegrationFlow?: boolean;
  installedPackagePolicy?: InstalledIntegrationPolicy;
}

export interface FlyOutProps extends BaseProps {
  onClose: () => void;
  defaultMode?: FlyoutMode;
}

export interface InstructionProps extends BaseProps {
  agentPolicies: AgentPolicy[];
  selectedPolicy: AgentPolicy | undefined;
  setSelectedPolicyId: (policyId?: string) => void;
  refreshAgentPolicies: () => void;
  isLoadingAgentPolicies?: boolean;
  onClickViewAgents: () => void;
  mode: FlyoutMode;
  setMode: (v: FlyoutMode) => void;
  selectionType: SelectionType;
  setSelectionType: (type: SelectionType) => void;
  selectedApiKeyId?: string;
  setSelectedAPIKeyId: (key?: string) => void;
  fleetServerHosts: string[];
  fleetProxy?: FleetProxy;
  downloadSource?: DownloadSource;
}
