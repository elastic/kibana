/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useShowRelatedCases } from './use_show_related_cases';

const mockedUseKibana = mockUseKibana();
const mockCanUseCases = jest.fn();

jest.mock('../../../../common/lib/kibana/kibana_react', () => {
  const original = jest.requireActual('../../../../common/lib/kibana/kibana_react');

  return {
    ...original,
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: {
          helpers: { canUseCases: mockCanUseCases },
        },
      },
    }),
  };
});

describe('useShowRelatedCases', () => {
  it(`should return false if user doesn't have cases read privilege`, () => {
    mockCanUseCases.mockReturnValue({
      all: false,
      create: false,
      read: false,
      update: false,
      delete: false,
      push: false,
    });

    const hookResult = renderHook(() => useShowRelatedCases());

    expect(hookResult.result.current).toEqual(false);
  });

  it('should return true if user has cases read privilege', () => {
    mockCanUseCases.mockReturnValue({
      all: false,
      create: false,
      read: true,
      update: false,
      delete: false,
      push: false,
    });

    const hookResult = renderHook(() => useShowRelatedCases());

    expect(hookResult.result.current).toEqual(true);
  });
});
