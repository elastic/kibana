/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { splitPkgKey } from '../../../../../../../common/services';

import { useGetPackageInfoByKey, useLink, useFleetServerHostsForPolicy } from '../../../../hooks';

import type { AddToPolicyParams, CreatePackagePolicyParams } from '../types';

import { useGetAgentPolicyOrDefault } from './hooks';

import {
  AddFirstIntegrationSplashScreen,
  MultiPageStepsLayout,
  InstallElasticAgentPageStep,
  AddIntegrationPageStep,
  ConfirmDataPageStep,
} from './components';

const installAgentStep = {
  title: i18n.translate('xpack.fleet.createFirstPackagePolicy.installAgentStepTitle', {
    defaultMessage: 'Install Elastic Agent',
  }),
  component: InstallElasticAgentPageStep,
};

const addIntegrationStep = {
  title: i18n.translate('xpack.fleet.createFirstPackagePolicy.addIntegrationStepTitle', {
    defaultMessage: 'Add the integration',
  }),
  component: AddIntegrationPageStep,
};

const confirmDataStep = {
  title: i18n.translate('xpack.fleet.createFirstPackagePolicy.confirmDataStepTitle', {
    defaultMessage: 'Confirm incoming data',
  }),
  component: ConfirmDataPageStep,
};

const fleetManagedSteps = [installAgentStep, addIntegrationStep, confirmDataStep];

const standaloneSteps = [addIntegrationStep, installAgentStep, confirmDataStep];

export const CreatePackagePolicyMultiPage: CreatePackagePolicyParams = ({
  queryParamsPolicyId,
  prerelease,
}) => {
  const { params } = useRouteMatch<AddToPolicyParams>();
  const { pkgkey, policyId, integration } = params;
  const { pkgName, pkgVersion } = splitPkgKey(pkgkey);
  const [onSplash, setOnSplash] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isManaged, setIsManaged] = useState(true);
  const { getHref } = useLink();
  const [enrolledAgentIds, setEnrolledAgentIds] = useState<string[]>([]);
  const toggleIsManaged = (newIsManaged: boolean) => {
    setIsManaged(newIsManaged);
    setCurrentStep(0);
  };
  const agentPolicyId = policyId || queryParamsPolicyId;
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKey(pkgName, pkgVersion, { prerelease, full: true });

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

  const splashScreenNext = () => {
    setOnSplash(false);
  };

  const { fleetServerHosts, fleetProxy, isLoadingInitialRequest } =
    useFleetServerHostsForPolicy(agentPolicy);

  const cancelUrl = getHref('add_integration_to_policy', {
    pkgkey,
    useMultiPageLayout: false,
    ...(integration ? { integration } : {}),
    ...(agentPolicyId ? { agentPolicyId } : {}),
  });

  if (onSplash || !packageInfo) {
    return (
      <AddFirstIntegrationSplashScreen
        isLoading={isPackageInfoLoading || isLoadingInitialRequest || isAgentPolicyLoading}
        error={packageInfoError || agentPolicyError}
        integrationInfo={integrationInfo}
        packageInfo={packageInfo}
        cancelUrl={cancelUrl}
        onNext={splashScreenNext}
      />
    );
  }

  const steps = isManaged ? fleetManagedSteps : standaloneSteps;
  const stepsNext = () => {
    if (currentStep === steps.length - 1) {
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const stepsBack = () => {
    if (currentStep === 0) {
      return;
    }

    setCurrentStep(currentStep - 1);
  };

  return (
    <MultiPageStepsLayout
      fleetServerHosts={fleetServerHosts}
      fleetProxy={fleetProxy}
      agentPolicy={agentPolicy}
      enrollmentAPIKey={enrollmentAPIKey}
      currentStep={currentStep}
      steps={steps}
      packageInfo={packageInfo}
      integrationInfo={integrationInfo}
      cancelUrl={cancelUrl}
      onNext={stepsNext}
      onBack={stepsBack}
      isManaged={isManaged}
      setIsManaged={toggleIsManaged}
      setEnrolledAgentIds={setEnrolledAgentIds}
      enrolledAgentIds={enrolledAgentIds}
    />
  );
};
