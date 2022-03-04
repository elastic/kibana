/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useAvailableCasesOwners } from './use_available_owners';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const hasAll = {
  securitySolutionCases: {
    crud_cases: true,
    read_cases: true,
  },
  observabilityCases: {
    crud_cases: true,
    read_cases: true,
  },
};

const hasSecurityAsCrudAndObservabilityAsRead = {
  securitySolutionCases: {
    crud_cases: true,
  },
  observabilityCases: {
    read_cases: true,
  },
};

const unrelatedFeatures = {
  bogusCapability: {
    crud_cases: true,
    read_cases: true,
  },
};

const mockKibana = (permissionType: unknown = hasAll) => {
  useKibanaMock.mockReturnValue({
    services: {
      application: {
        capabilities: permissionType,
      },
    },
  } as unknown as ReturnType<typeof useKibana>);
};

describe('useAvailableCasesOwners correctly grabs user case permissions', () => {
  it('returns all available owner types if user has access to all', () => {
    mockKibana();
    const { result } = renderHook(useAvailableCasesOwners);

    expect(result.current).toEqual([SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER]);
  });

  it('returns no owner types if user has access to none', () => {
    mockKibana({});
    const { result } = renderHook(useAvailableCasesOwners);

    expect(result.current).toEqual([]);
  });

  it('returns only the permission it should have with CRUD as default', () => {
    mockKibana(hasSecurityAsCrudAndObservabilityAsRead);
    const { result } = renderHook(useAvailableCasesOwners);

    expect(result.current).toEqual([SECURITY_SOLUTION_OWNER]);
  });

  it('returns only the permission it should have with READ as default', () => {
    mockKibana(hasSecurityAsCrudAndObservabilityAsRead);
    const { result } = renderHook(() => useAvailableCasesOwners('read'));

    expect(result.current).toEqual([OBSERVABILITY_OWNER]);
  });

  it('returns no owners when the capabilities does not contain valid entries', () => {
    mockKibana(unrelatedFeatures);
    const { result } = renderHook(useAvailableCasesOwners);

    expect(result.current).toEqual([]);
  });
});
