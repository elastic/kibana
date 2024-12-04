/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

import type {
  RegistryPolicyTemplate,
  PackageInfo,
  AgentPolicy,
  EnrollmentAPIKey,
  FleetProxy,
  DownloadSource,
} from '../../../../types';
import type { InstalledIntegrationPolicy } from '../../../../../../components/agent_enrollment_flyout/use_get_agent_incoming_data';

export interface MultiPageStep {
  title: string;
  component: React.FC<MultiPageStepLayoutProps>;
}

export interface MultiPageStepLayoutProps {
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
  cancelUrl: string;
  steps: MultiPageStep[];
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
  withHeader?: boolean;
  withBreadcrumb?: boolean;
}
