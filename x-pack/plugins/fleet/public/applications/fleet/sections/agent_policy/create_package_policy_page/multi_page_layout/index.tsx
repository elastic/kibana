/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { useRouteMatch } from 'react-router-dom';

import { splitPkgKey } from '../../../../../../../common';

import { useGetPackageInfoByKey } from '../../../../hooks';

import type { AddToPolicyParams, CreatePackagePolicyParams } from '../types';
import { useCancelAddPackagePolicy } from '../hooks';

import {
  AddFirstIntegrationSplashScreen,
  MultiPageStepsLayout,
  InstallElasticAgentPageStep,
  AddIntegrationPageStep,
} from './components';

const fleetManagedSteps = [
  {
    title: 'Install Elastic Agent',
    component: InstallElasticAgentPageStep,
  },
  {
    title: 'Add the integration',
    component: AddIntegrationPageStep,
  },
  {
    title: 'Confirm incoming data',
    component: InstallElasticAgentPageStep,
  },
];

const standaloneSteps = [
  {
    title: 'Add the integration',
    component: AddIntegrationPageStep,
  },
  {
    title: 'Install Elastic Agent',
    component: InstallElasticAgentPageStep,
  },
  {
    title: 'Confirm incoming data',
    component: InstallElasticAgentPageStep,
  },
];

export const CreatePackagePolicyMultiPage: CreatePackagePolicyParams = ({ from }) => {
  const { params } = useRouteMatch<AddToPolicyParams>();

  const { pkgName, pkgVersion } = splitPkgKey(params.pkgkey);
  const [onSplash, setOnSplash] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isManaged, setIsManaged] = useState(true);
  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKey(pkgName, pkgVersion);

  const packageInfo = useMemo(() => packageInfoData?.item, [packageInfoData]);

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
        isLoading={isPackageInfoLoading}
        error={packageInfoError}
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
      currentStep={currentStep}
      steps={steps}
      packageInfo={packageInfo}
      integrationInfo={integrationInfo}
      cancelUrl={cancelUrl}
      cancelClickHandler={cancelClickHandler}
      onNext={stepsNext}
      onBack={stepsBack}
      isManaged={isManaged}
      setIsManaged={(newIsManaged: boolean) => {
        setIsManaged(newIsManaged);
        setCurrentStep(0);
      }}
    />
  );
};
