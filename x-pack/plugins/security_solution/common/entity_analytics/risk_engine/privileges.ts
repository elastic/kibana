/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsPrivileges } from '../../api/entity_analytics/common';
import {
  RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
  RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
} from './constants';

export type MissingClusterPrivileges = string[];
export type MissingIndexPrivileges = Array<readonly [indexName: string, privileges: string[]]>;

export interface MissingPrivileges {
  clusterPrivileges: MissingClusterPrivileges;
  indexPrivileges: MissingIndexPrivileges;
}

export const getMissingIndexPrivileges = (
  privileges: EntityAnalyticsPrivileges['privileges']['elasticsearch']['index']
): MissingIndexPrivileges => {
  const missingIndexPrivileges: MissingIndexPrivileges = [];

  if (!privileges) {
    return missingIndexPrivileges;
  }

  for (const [indexName, requiredPrivileges] of Object.entries(
    RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES
  )) {
    const missingPrivileges = requiredPrivileges.filter(
      (privilege) => !privileges[indexName][privilege]
    );

    if (missingPrivileges.length) {
      missingIndexPrivileges.push([indexName, missingPrivileges]);
    }
  }

  return missingIndexPrivileges;
};

export const getMissingRiskEnginePrivileges = (
  privileges: EntityAnalyticsPrivileges['privileges']
): MissingPrivileges => {
  const missingIndexPrivileges = getMissingIndexPrivileges(privileges.elasticsearch.index);
  const missingClusterPrivileges = RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES.filter(
    (privilege) => !privileges.elasticsearch.cluster?.[privilege]
  );

  return {
    indexPrivileges: missingIndexPrivileges,
    clusterPrivileges: missingClusterPrivileges,
  };
};
