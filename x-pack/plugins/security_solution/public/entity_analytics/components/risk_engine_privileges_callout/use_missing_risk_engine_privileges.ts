/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics/common';
import { useRiskEnginePrivileges } from '../../api/hooks/use_risk_engine_privileges';
import {
  RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
  RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
} from '../../../../common/risk_engine';

const getMissingIndexPrivileges = (
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

export type MissingClusterPrivileges = string[];
export type MissingIndexPrivileges = Array<[indexName: string, privileges: string[]]>;

export interface MissingPrivileges {
  clusterPrivileges: MissingClusterPrivileges;
  indexPrivileges: MissingIndexPrivileges;
}

export type MissingPrivilegesResponse =
  | { isLoading: true }
  | { isLoading: false; hasAllRequiredPrivileges: true }
  | { isLoading: false; missingPrivileges: MissingPrivileges; hasAllRequiredPrivileges: false };

export const useMissingPrivileges = (): MissingPrivilegesResponse => {
  const { data: privilegesResponse, isLoading } = useRiskEnginePrivileges();

  return useMemo<MissingPrivilegesResponse>(() => {
    if (isLoading || !privilegesResponse) {
      return {
        isLoading: true,
      };
    }

    if (privilegesResponse.has_all_required) {
      return {
        isLoading: false,
        hasAllRequiredPrivileges: true,
      };
    }

    const { privileges } = privilegesResponse;
    const missinIndexPrivileges = getMissingIndexPrivileges(privileges.elasticsearch.index);
    const missingClusterPrivileges = RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES.filter(
      (privilege) => !privileges.elasticsearch.cluster?.[privilege]
    );

    return {
      isLoading: false,
      hasAllRequiredPrivileges: false,
      missingPrivileges: {
        indexPrivileges: missinIndexPrivileges,
        clusterPrivileges: missingClusterPrivileges,
      },
    };
  }, [isLoading, privilegesResponse]);
};
