/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useCaseObservables } from './use_case_observables';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { OBSERVABLE_TYPES_BUILTIN_KEYS } from '../../../common/constants';
import { caseData } from './mocks';

const mockCaseData = {
  ...caseData,
  observables: [
    {
      typeKey: 'type1',
      value: '127.0.0.1',
      description: null,
      id: '6d44e478-3b35-4c48-929a-b22e98bfe178',
      createdAt: '2024-12-02',
      updatedAt: '2024-12-02',
    },
  ],
};

jest.mock('../../containers/configure/use_get_case_configuration');

describe('useCaseObservables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns loading state when configuration is loading', () => {
    (useGetCaseConfiguration as jest.Mock).mockReturnValue({
      data: { observableTypes: [] },
      isLoading: true,
    });

    const { result } = renderHook(() => useCaseObservables(mockCaseData));

    expect(result.current).toEqual({
      observables: [],
      isLoading: true,
    });
  });

  it('filters observables based on available types', () => {
    (useGetCaseConfiguration as jest.Mock).mockReturnValue({
      data: { observableTypes: [{ key: 'type1' }] },
      isLoading: false,
    });

    const { result } = renderHook(() => useCaseObservables(mockCaseData));

    expect(result.current).toEqual({
      observables: [
        {
          typeKey: 'type1',
          value: '127.0.0.1',
          description: null,
          id: '6d44e478-3b35-4c48-929a-b22e98bfe178',
          createdAt: '2024-12-02',
          updatedAt: '2024-12-02',
        },
      ],
      isLoading: false,
    });
  });

  it('includes built-in observable types', () => {
    (useGetCaseConfiguration as jest.Mock).mockReturnValue({
      data: { observableTypes: [] },
      isLoading: false,
    });

    const { result } = renderHook(() => useCaseObservables(mockCaseData));

    expect(result.current.observables).toEqual(
      mockCaseData.observables.filter(({ typeKey }) =>
        OBSERVABLE_TYPES_BUILTIN_KEYS.includes(typeKey)
      )
    );
  });
});
