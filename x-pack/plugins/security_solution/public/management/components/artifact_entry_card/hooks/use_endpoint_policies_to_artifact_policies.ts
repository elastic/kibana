/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { MenuItemPropsByPolicyId } from '..';
import { PolicyData } from '../../../../../common/endpoint/types';
import { useAppUrl } from '../../../../common/lib/kibana';
import { getPolicyDetailPath } from '../../../common/routing';

/**
 * Takes a list of EndpointPolicies (PolicyData) and turn them
 * into MenuItemPropsByPolicyId required by the artifact card.
 *
 * The resulting menu will open the policies in a new tab
 *
 */
export const useEndpointPoliciesToArtifactPolicies = (
  policies: PolicyData[] = []
): MenuItemPropsByPolicyId => {
  const { getAppUrl } = useAppUrl();
  return useMemo(() => {
    const data = policies.reduce<MenuItemPropsByPolicyId>((policiesMap, policy) => {
      const policyId = policy.id;
      const policyDetailsPath = getPolicyDetailPath(policyId);
      policiesMap[policyId] = {
        href: getAppUrl({ path: policyDetailsPath }),
        children: policy.name ?? policyId,
        target: '_blank',
      };
      return policiesMap;
    }, {});
    return data;
  }, [getAppUrl, policies]);
};
