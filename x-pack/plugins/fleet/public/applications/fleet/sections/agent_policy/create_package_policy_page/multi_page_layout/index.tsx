/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { splitPkgKey } from '../../../../../../../common';

import { useGetPackageInfoByKey, useGetSettings } from '../../../../hooks';

import type { AddToPolicyParams, CreatePackagePolicyParams } from '../types';
import { useCancelAddPackagePolicy } from '../hooks';

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
  from,
  queryParamsPolicyId,
}) => {
  const { params } = useRouteMatch<AddToPolicyParams>();

  const { pkgName, pkgVersion } = splitPkgKey(params.pkgkey);
  const [onSplash, setOnSplash] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isManaged, setIsManaged] = useState(true);
  const [enrolledAgentIds, setEnrolledAgentIds] = useState<string[]>([]);
  const toggleIsManaged = (newIsManaged: boolean) => {
    setIsManaged(newIsManaged);
    setCurrentStep(0);
  };

  const { isLoading: isSettingsLoading, data: settingsData } = useGetSettings();

  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKey(pkgName, pkgVersion);

  const {
    agentPolicy,
    enrollmentAPIKey,
    error: agentPolicyError,
    isLoading: isAgentPolicyLoading,
  } = useGetAgentPolicyOrDefault(queryParamsPolicyId);

  const packageInfo = useMemo(() => packageInfoData?.item, [packageInfoData]);
  const settings = useMemo(() => settingsData?.item, [settingsData]);

  const integrationInfo = useMemo(() => {
    if (!params.integration) return;
    return packageInfo?.policy_templates?.find(
      (policyTemplate) => policyTemplate.name === params.integration
    );
  }, [packageInfo?.policy_templates, params]);

  const splashScreenNext = () => {
    setOnSplash(false);
  };

  const { cancelClickHandler, cancelUrl } = useCancelAddPackagePolicy({
    from,
    pkgkey: params.pkgkey,
  });

  if (onSplash || !packageInfo) {
    return (
      <AddFirstIntegrationSplashScreen
        isLoading={isPackageInfoLoading || isSettingsLoading || isAgentPolicyLoading}
        error={packageInfoError || agentPolicyError}
        integrationInfo={integrationInfo}
        packageInfo={packageInfo}
        cancelUrl={cancelUrl}
        cancelClickHandler={cancelClickHandler}
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
      cancelClickHandler(null);
      return;
    }

    setCurrentStep(currentStep - 1);
  };

  return (
    <MultiPageStepsLayout
      settings={settings}
      agentPolicy={agentPolicy}
      enrollmentAPIKey={enrollmentAPIKey}
      currentStep={currentStep}
      steps={steps}
      packageInfo={packageInfo}
      integrationInfo={integrationInfo}
      cancelUrl={cancelUrl}
      cancelClickHandler={cancelClickHandler}
      onNext={stepsNext}
      onBack={stepsBack}
      isManaged={isManaged}
      setIsManaged={toggleIsManaged}
      setEnrolledAgentIds={setEnrolledAgentIds}
      enrolledAgentIds={enrolledAgentIds}
    />
  );
};
