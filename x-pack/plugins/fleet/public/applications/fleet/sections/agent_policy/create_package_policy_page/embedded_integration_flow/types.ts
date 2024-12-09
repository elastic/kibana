/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstalledIntegrationPolicy } from '../../../../../../components/agent_enrollment_flyout/use_get_agent_incoming_data';
import type { DetailViewPanelName } from '../../../../../integrations/sections/epm/screens/detail';
import type {
  FleetProxy,
  DownloadSource,
  AgentPolicy,
  EnrollmentAPIKey,
  PackageInfo,
  RegistryPolicyTemplate,
} from '../../../../types';
import type { EditPackagePolicyFrom } from '../types';

export interface EmbeddedIntegrationStepsLayoutProps {
  fleetServerHost: string;
  fleetProxy?: FleetProxy;
  downloadSource?: DownloadSource;
  agentPolicy?: AgentPolicy;
  error?: Error;
  enrollmentAPIKey?: EnrollmentAPIKey;
  packageInfo: PackageInfo;
  integrationInfo?: RegistryPolicyTemplate;
  cancelClickHandler?: React.ReactEventHandler;
  onBack: React.ReactEventHandler;
  steps: EmbeddedFlowStep[];
  currentStep: number;
  onNext: (params?: { selectedAgentPolicies?: AgentPolicy[]; toStep?: number }) => void;
  setIsManaged: (isManaged: boolean) => void;
  isManaged: boolean;
  setEnrolledAgentIds: (agentIds: string[]) => void;
  enrolledAgentIds: string[];
  onCancel?: () => void;
  prerelease: boolean;
  hasIncomingDataStep?: boolean;
  installedPackagePolicy?: InstalledIntegrationPolicy;
  selectedAgentPolicies?: AgentPolicy[];
  isIntegrationFlow?: boolean;
  handleViewAssets: () => void;
}

export interface EmbeddedIntegrationFlowProps {
  from: EditPackagePolicyFrom;
  queryParamsPolicyId?: string;
  propPolicyId?: string;
  integrationName?: string;
  prerelease: boolean;
  onNext?: (params?: { selectedAgentPolicies?: AgentPolicy[] }) => void;
  onCancel?: () => void;
  setIntegrationStep?: (step: number) => void;
  setSelectedDetailsTab: (tab: DetailViewPanelName) => void;
  handleViewAssets: () => void;
}

export interface EmbeddedFlowStep {
  title: string;
  component: React.FC<EmbeddedIntegrationStepsLayoutProps>;
}
