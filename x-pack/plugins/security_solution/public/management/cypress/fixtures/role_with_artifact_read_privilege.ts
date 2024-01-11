/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEndpointSecurityPolicyManager } from '../../../../scripts/endpoint/common/roles_users';

export const getRoleWithArtifactReadPrivilege = (privilegePrefix: string) => {
  const endpointSecurityPolicyManagerRole = getEndpointSecurityPolicyManager();

  return {
    ...endpointSecurityPolicyManagerRole,
    kibana: [
      {
        ...endpointSecurityPolicyManagerRole.kibana[0],
        feature: {
          ...endpointSecurityPolicyManagerRole.kibana[0].feature,
          siem: [
            ...endpointSecurityPolicyManagerRole.kibana[0].feature.siem.filter(
              (privilege) => privilege !== `${privilegePrefix}all`
            ),
            `${privilegePrefix}read`,
          ],
        },
      },
    ],
  };
};
