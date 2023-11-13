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
  RISK_ENGINE_REQUIRED_KIBANA_PRIVILEGES,
} from '../../../common/risk_engine';

const groupByPrivilege = (
  privileges: Array<{
    privilege: string;
    authorized: boolean;
  }>
): Record<string, boolean> => {
  return privileges.reduce<Record<string, boolean>>((acc, { privilege, authorized }) => {
    return {
      ...acc,
      [privilege]: authorized,
    };
  }, {});
};

export async function getUserRiskEnginePrivileges(
  request: KibanaRequest,
  security: SecurityPluginStart
): Promise<RiskEnginePrivilegesResponse> {
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { privileges, hasAllRequested } = await checkPrivileges({
    kibana: RISK_ENGINE_REQUIRED_KIBANA_PRIVILEGES,
    elasticsearch: {
      cluster: RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
      index: RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
    },
  });

  const clusterPrivilegesByPrivilege = groupByPrivilege(privileges.elasticsearch.cluster);
  const kibanaPrivilegesByPrivilege = groupByPrivilege(privileges.kibana);

  const indexPrivilegesByIndex = Object.entries(privileges.elasticsearch.index).reduce<
    Record<string, Record<string, boolean>>
  >((acc, [index, indexPrivileges]) => {
    return { ...acc, [index]: groupByPrivilege(indexPrivileges) };
  }, {});

  return {
    privileges: {
      kibana: kibanaPrivilegesByPrivilege,
      elasticsearch: {
        cluster: clusterPrivilegesByPrivilege,
        index: indexPrivilegesByIndex,
      },
    },
    has_all_required: hasAllRequested,
  };
}
