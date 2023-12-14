/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useRiskEnginePrivileges } from '../api/hooks/use_risk_engine_privileges';
import { getMissingRiskEnginePrivileges } from '../../../common/entity_analytics/risk_engine';
import type { MissingPrivileges } from '../../../common/entity_analytics/risk_engine';
export type RiskEngineMissingPrivilegesResponse =
  | { isLoading: true }
  | { isLoading: false; hasAllRequiredPrivileges: true }
  | {
      isLoading: false;
      missingPrivileges: MissingPrivileges;
      hasAllRequiredPrivileges: false;
    };

export const useMissingRiskEnginePrivileges = (): RiskEngineMissingPrivilegesResponse => {
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
      privilegesResponse.privileges
    );

    return {
      isLoading: false,
      hasAllRequiredPrivileges: false,
      missingPrivileges: {
        indexPrivileges,
        clusterPrivileges,
      },
    };
  }, [isLoading, privilegesResponse]);
};
