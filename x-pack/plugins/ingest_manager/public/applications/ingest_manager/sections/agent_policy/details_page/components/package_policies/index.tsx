/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { AgentPolicy, PackagePolicy } from '../../../../../types';
import { NoPackagePolicies } from './no_package_policies';
import { PackagePoliciesTable } from './package_policies_table';

export const PackagePoliciesView = memo<{ agentPolicy: AgentPolicy }>(({ agentPolicy }) => {
  if (agentPolicy.package_policies.length === 0) {
    return <NoPackagePolicies policyId={agentPolicy.id} />;
  }

  return (
    <PackagePoliciesTable
      agentPolicy={agentPolicy}
      packagePolicies={(agentPolicy.package_policies || []) as PackagePolicy[]}
    />
  );
});
