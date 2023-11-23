/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { RiskEnginePrivilegesResponse } from './types';
import {
  RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
  RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
} from '../../../../common/risk_engine';

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

export async function getUserRiskEnginePrivileges(
  request: KibanaRequest,
  security: SecurityPluginStart
): Promise<RiskEnginePrivilegesResponse> {
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { privileges, hasAllRequested } = await checkPrivileges({
    elasticsearch: {
      cluster: RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
      index: RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
    },
  });

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
