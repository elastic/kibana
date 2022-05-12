/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { useRouteMatch } from 'react-router-dom';

import { splitPkgKey } from '../../../../../../../common';

import { useGetPackageInfoByKey } from '../../../../hooks';

import type { AddToPolicyParams, CreatePackagePolicyParams } from '../types';
import { useCancelAddPackagePolicy } from '../hooks';

import { AddFirstIntegrationSplashScreen } from './components/add_first_integration_splash';
export const CreatePackagePolicyMultiPage: CreatePackagePolicyParams = ({ from }) => {
  const { params } = useRouteMatch<AddToPolicyParams>();

  const { pkgName, pkgVersion } = splitPkgKey(params.pkgkey);

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

  const spashScreenNext = () => {}; // TODO: this will display the add package policy steps

  const { cancelClickHandler, cancelUrl } = useCancelAddPackagePolicy({
    from,
    pkgkey: params.pkgkey,
    // agentPolicyId, TODO: Provide agent policy
  });

  return (
    <AddFirstIntegrationSplashScreen
      isLoading={isPackageInfoLoading}
      error={packageInfoError}
      integrationInfo={integrationInfo}
      packageInfo={packageInfo}
      cancelUrl={cancelUrl}
      cancelClickHandler={cancelClickHandler}
      onNext={spashScreenNext}
    />
  );
};
