/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useRouteMatch } from 'react-router-dom';

// TODO: Needs to be moved
import { EditPackagePolicyForm } from '../../../../../fleet/sections/agent_policy/edit_package_policy_page';
import { useGetOnePackagePolicy, useUIExtension } from '../../../../hooks';

export const Policy = memo(() => {
  const {
    params: { packagePolicyId },
  } = useRouteMatch<{ packagePolicyId: string }>();

  const packagePolicy = useGetOnePackagePolicy(packagePolicyId);

  const extensionView = useUIExtension(
    packagePolicy.data?.item?.package?.name ?? '',
    'package-policy-edit'
  );

  return (
    <EditPackagePolicyForm
      packagePolicyId={packagePolicyId}
      from="package-edit"
      forceUpgrade={extensionView?.useLatestPackageVersion}
    />
  );
});
