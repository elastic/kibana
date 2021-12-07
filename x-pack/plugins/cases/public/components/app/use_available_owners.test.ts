/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

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

const hasSecurityAsCrud = {
  securitySolutionCases: {
    crud_cases: true,
  },
  observabilityCases: {
    read_cases: true,
  },
};

const hasObservabilityAsRead = {
  observabilityCases: {
    read_cases: true,
  },
  securitySolutionCases: {
    crud_cases: true,
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

describe('useKibanaMock', () => {
  it('returns all available owner types if user has access to all', () => {
    mockKibana();
    const { result } = renderHook(useAvailableCasesOwners);

    expect(result.current).toEqual(['securitySolution', 'observability']);
  });

  it('returns no owner types if user has access to none', () => {
    mockKibana({});
    const { result } = renderHook(useAvailableCasesOwners);

    expect(result.current).toEqual([]);
  });

  it('returns only the permission it should have with CRUD as default', () => {
    mockKibana(hasSecurityAsCrud);
    const { result } = renderHook(useAvailableCasesOwners);

    expect(result.current).toEqual(['securitySolution']);
  });

  it('returns only the permission it should have with READ as default', () => {
    mockKibana(hasObservabilityAsRead);
    const { result } = renderHook(() => useAvailableCasesOwners('read'));

    expect(result.current).toEqual(['observability']);
  });
});
