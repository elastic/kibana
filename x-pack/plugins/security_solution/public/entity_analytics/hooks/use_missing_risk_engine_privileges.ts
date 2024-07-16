/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { useRiskEnginePrivileges } from '../api/hooks/use_risk_engine_privileges';
import { getMissingRiskEnginePrivileges } from '../../../common/entity_analytics/risk_engine';
import type {
  MissingPrivileges,
  RiskEngineIndexPrivilege,
} from '../../../common/entity_analytics/risk_engine';
export type RiskEngineMissingPrivilegesResponse =
  | { isLoading: true }
  | { isLoading: false; hasAllRequiredPrivileges: true }
  | {
      isLoading: false;
      missingPrivileges: MissingPrivileges;
      hasAllRequiredPrivileges: false;
    };

export const useMissingRiskEnginePrivileges = (
  required: NonEmptyArray<RiskEngineIndexPrivilege> = ['read', 'write']
): RiskEngineMissingPrivilegesResponse => {
  const { data: privilegesResponse, isLoading } = useRiskEnginePrivileges();

  return useMemo<RiskEngineMissingPrivilegesResponse>(() => {
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

    const { indexPrivileges, clusterPrivileges } = getMissingRiskEnginePrivileges(
      privilegesResponse.privileges,
      required
    );

    // privilegesResponse.has_all_required` is slightly misleading, it checks if it has *all* default required privileges.
    // Here we check if there are no missing privileges of the provided set of required privileges
    if (indexPrivileges.every(([_, missingPrivileges]) => missingPrivileges.length === 0)) {
      return {
        isLoading: false,
        hasAllRequiredPrivileges: true,
      };
    }

    return {
      isLoading: false,
      hasAllRequiredPrivileges: false,
      missingPrivileges: {
        indexPrivileges,
        clusterPrivileges,
      },
    };
  }, [isLoading, privilegesResponse, required]);
};
