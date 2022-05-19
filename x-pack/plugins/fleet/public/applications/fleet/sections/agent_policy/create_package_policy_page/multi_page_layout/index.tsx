/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { useRouteMatch } from 'react-router-dom';

import { splitPkgKey } from '../../../../../../../common';

import { useGetPackageInfoByKey, useGetSettings } from '../../../../hooks';

import type { AddToPolicyParams, CreatePackagePolicyParams } from '../types';
import { useCancelAddPackagePolicy, useEnsureDefaultAgentPolicy } from '../hooks';

import {
  AddFirstIntegrationSplashScreen,
  MultiPageStepsLayout,
  InstallElasticAgentManagedPageStep,
  InstallElasticAgentStandalonePageStep,
  AddIntegrationPageStep,
} from './components';

const fleetManagedSteps = [
  {
    title: 'Install Elastic Agent',
    component: InstallElasticAgentManagedPageStep,
  },
  {
    title: 'Add the integration',
    component: AddIntegrationPageStep,
  },
  {
    title: 'Confirm incoming data',
    component: AddIntegrationPageStep,
  },
];

const standaloneSteps = [
  {
    title: 'Add the integration',
    component: AddIntegrationPageStep,
  },
  {
    title: 'Install Elastic Agent',
    component: InstallElasticAgentStandalonePageStep,
  },
  {
    title: 'Confirm incoming data',
    component: AddIntegrationPageStep,
  },
];

export const CreatePackagePolicyMultiPage: CreatePackagePolicyParams = ({ from }) => {
  const { params } = useRouteMatch<AddToPolicyParams>();

  const { pkgName, pkgVersion } = splitPkgKey(params.pkgkey);
  const [onSplash, setOnSplash] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isManaged, setIsManaged] = useState(true);
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
    agentPolicy: defaultAgentPolicy,
    enrollmentAPIKey,
    error: agentPolicyError,
    isLoading: isAgentPolicyLoading,
  } = useEnsureDefaultAgentPolicy();

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
      agentPolicy={defaultAgentPolicy}
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
    />
  );
};
