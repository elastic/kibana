/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { CheckPrivilegesPayload, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics/common';
const groupPrivilegesByName = <PrivilegeName extends string>(
  privileges: Array<{
    privilege: PrivilegeName;
    authorized: boolean;
  }>
): Record<PrivilegeName, boolean> => {
  return privileges.reduce<Record<string, boolean>>((acc, { privilege, authorized }) => {
    acc[privilege] = authorized;
    return acc;
  }, {});
};

interface CheckAndFormatPrivilegesOpts {
  request: KibanaRequest;
  security: SecurityPluginStart;
  privilegesToCheck: Pick<CheckPrivilegesPayload, 'elasticsearch'>;
}

export async function checkAndFormatPrivileges({
  request,
  security,
  privilegesToCheck,
}: CheckAndFormatPrivilegesOpts): Promise<EntityAnalyticsPrivileges> {
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { privileges, hasAllRequested } = await checkPrivileges(privilegesToCheck);

  const clusterPrivilegesByPrivilege = groupPrivilegesByName(privileges.elasticsearch.cluster);

  const indexPrivilegesByIndex = Object.entries(privileges.elasticsearch.index).reduce<
    Record<string, Record<string, boolean>>
  >((acc, [index, indexPrivileges]) => {
    acc[index] = groupPrivilegesByName(indexPrivileges);
    return acc;
  }, {});

  return {
    privileges: {
      elasticsearch: {
        cluster: clusterPrivilegesByPrivilege,
        index: indexPrivilegesByIndex,
      },
    },
    has_all_required: hasAllRequested,
  };
}
