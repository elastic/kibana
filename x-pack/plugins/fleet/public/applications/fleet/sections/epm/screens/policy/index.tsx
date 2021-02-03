/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { EditPackagePolicyForm } from '../../../agent_policy/edit_package_policy_page';

export const Policy = memo(() => {
  const {
    params: { packagePolicyId },
  } = useRouteMatch<{ packagePolicyId: string }>();

  return <EditPackagePolicyForm packagePolicyId={packagePolicyId} from="package-edit" />;
});
