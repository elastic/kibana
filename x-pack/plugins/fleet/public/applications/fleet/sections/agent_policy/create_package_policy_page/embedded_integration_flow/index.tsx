/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { splitPkgKey } from '../../../../../../../common/services';

import {
  useGetPackageInfoByKeyQuery,
  useLink,
  useFleetServerHostsForPolicy,
  useStartServices,
} from '../../../../hooks';

import type { CreatePackagePolicyParams } from '../types';

import { useIntegrationsStateContext } from '../../../../../integrations/hooks';

import type { AgentPolicy } from '../../../../types';
import { useGetAgentPolicyOrDefault } from '../multi_page_layout/hooks';
import { onboardingSteps } from '../multi_page_layout/components/onboarding_steps';
import { Loading } from '../../../../components';

import { EmbeddedIntegrationStepsLayout } from './embedded_integration_steps_layout';

export const EmbeddedIntegrationFlow: CreatePackagePolicyParams = ({
  queryParamsPolicyId,
  prerelease,
  from,
  integrationName,
  setIntegrationStep,
  onCancel,
  withHeader,
  withBreadcrumb,
}) => {
  const { notifications } = useStartServices();

  const { pkgkey: pkgKeyContext } = useIntegrationsStateContext();
  const pkgkey = pkgKeyContext || '';
  const { pkgName, pkgVersion } = splitPkgKey(pkgkey);
  const [currentStep, setCurrentStep] = useState(0);
  const [isManaged, setIsManaged] = useState(true);
  const { getHref } = useLink();
  const [enrolledAgentIds, setEnrolledAgentIds] = useState<string[]>([]);
  const [selectedAgentPolicies, setSelectedAgentPolicies] = useState<AgentPolicy[]>();
  const toggleIsManaged = (newIsManaged: boolean) => {
    setIsManaged(newIsManaged);
    setCurrentStep(0);
  };

  const integration = integrationName;
  const agentPolicyId = selectedAgentPolicies?.[0]?.id;
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKeyQuery(pkgName, pkgVersion, { prerelease, full: true });

  const {
    agentPolicy,
    enrollmentAPIKey,
    error: agentPolicyError,
    isLoading: isAgentPolicyLoading,
  } = useGetAgentPolicyOrDefault(agentPolicyId);

  const packageInfo = useMemo(() => packageInfoData?.item, [packageInfoData]);

  const integrationInfo = useMemo(() => {
    if (!integration) return;
    return packageInfo?.policy_templates?.find(
      (policyTemplate) => policyTemplate.name === integration
    );
  }, [packageInfo?.policy_templates, integration]);

  const { fleetServerHost, fleetProxy, downloadSource } = useFleetServerHostsForPolicy(agentPolicy);

  const cancelUrl = getHref('add_integration_to_policy', {
    pkgkey,
    useMultiPageLayout: false,
    ...(integration ? { integration } : {}),
    ...(agentPolicyId ? { agentPolicyId } : {}),
  });

  const stepsNext = useCallback(
    (props?: { selectedAgentPolicies?: AgentPolicy[]; toStep?: number }) => {
      if (currentStep === onboardingSteps.length - 1) {
        return;
      }

      setCurrentStep(props?.toStep ?? currentStep + 1);
      setIntegrationStep?.(props?.toStep ?? currentStep + 1);
      if (props?.selectedAgentPolicies) {
        setSelectedAgentPolicies(props?.selectedAgentPolicies);
      }
    },
    [currentStep, setIntegrationStep]
  );

  const stepsBack = () => {
    if (currentStep === 0) {
      return;
    }

    setCurrentStep(currentStep - 1);
  };

  useEffect(() => {
    if (!isPackageInfoLoading && packageInfoError) {
      notifications.toasts.addError(packageInfoError, {
        title: i18n.translate('xpack.fleet.createPackagePolicy.errorLoadingPackageTitle', {
          defaultMessage: 'Error loading package information',
        }),
        toastMessage: packageInfoError.message,
      });
    }
  }, [isPackageInfoLoading, notifications.toasts, packageInfoError]);

  useEffect(() => {
    if (!isAgentPolicyLoading && agentPolicyError) {
      notifications.toasts.addError(agentPolicyError, {
        title: i18n.translate('xpack.fleet.createPackagePolicy.errorLoadingAgentPolicyTitle', {
          defaultMessage: 'Error loading agent policy information',
        }),
        toastMessage: agentPolicyError.message,
      });
    }
  }, [isAgentPolicyLoading, notifications.toasts, agentPolicyError]);

  return !isPackageInfoLoading && packageInfo ? (
    <EmbeddedIntegrationStepsLayout
      fleetServerHost={fleetServerHost}
      fleetProxy={fleetProxy}
      downloadSource={downloadSource}
      agentPolicy={selectedAgentPolicies?.[0] ?? agentPolicy}
      enrollmentAPIKey={enrollmentAPIKey}
      currentStep={currentStep}
      steps={onboardingSteps}
      packageInfo={packageInfo}
      integrationInfo={integrationInfo}
      cancelUrl={cancelUrl}
      onNext={stepsNext}
      onBack={stepsBack}
      isManaged={isManaged}
      setIsManaged={toggleIsManaged}
      setEnrolledAgentIds={setEnrolledAgentIds}
      enrolledAgentIds={enrolledAgentIds}
      onCancel={onCancel}
      hasIncomingDataStep={false}
      prerelease={prerelease}
      withHeader={withHeader}
      withBreadcrumb={withBreadcrumb}
    />
  ) : (
    <Loading />
  );
};
