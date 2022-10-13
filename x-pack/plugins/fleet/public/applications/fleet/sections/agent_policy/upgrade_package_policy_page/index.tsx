/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useLocation, useRouteMatch } from 'react-router-dom';

import type { EditPackagePolicyFrom } from '../create_package_policy_page/types';

import { EditPackagePolicyForm } from '../edit_package_policy_page';

export const UpgradePackagePolicyPage = memo(() => {
  const {
    params: { packagePolicyId },
  } = useRouteMatch<{ policyId: string; packagePolicyId: string }>();
  const { search } = useLocation();

  const qs = new URLSearchParams(search);
  const fromQs = qs.get('from');

  let from: EditPackagePolicyFrom | undefined;

  // Shorten query strings to make them more presentable in the URL
  if (fromQs && fromQs === 'fleet-policy-list') {
    from = 'upgrade-from-fleet-policy-list';
  } else if (fromQs && fromQs === 'integrations-policy-list') {
    from = 'upgrade-from-integrations-policy-list';
  }

  return <EditPackagePolicyForm packagePolicyId={packagePolicyId} from={from} forceUpgrade />;
});
