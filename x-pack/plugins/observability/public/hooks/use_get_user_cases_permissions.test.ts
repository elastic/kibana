/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { applicationServiceMock } from 'src/core/public/mocks';
import { casesFeatureId } from '../../common';
import { useGetUserCasesPermissions } from './use_get_user_cases_permissions';
import { kibanaStartMock } from '../utils/kibana_react.mock';

let mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

describe('useGetUserCasesPermissions', function () {
  it('returns expected permissions when capabilities entry exists', () => {
    mockUseKibanaReturnValue = {
      ...mockUseKibanaReturnValue,
      services: {
        ...mockUseKibanaReturnValue.services,
        application: {
          ...mockUseKibanaReturnValue.services.application,
          capabilities: {
            ...applicationServiceMock.createStartContract().capabilities,
            [casesFeatureId]: { crud_cases: false, read_cases: true },
          },
        },
      },
    };
    const { result } = renderHook(() => useGetUserCasesPermissions(), {});
    expect(result.current?.read).toBe(true);
    expect(result.current?.crud).toBe(false);
  });

  it('returns false when capabilities entry permissions are missing', () => {
    mockUseKibanaReturnValue = {
      ...mockUseKibanaReturnValue,
      services: {
        ...mockUseKibanaReturnValue.services,
        application: {
          ...mockUseKibanaReturnValue.services.application,
          capabilities: {
            ...applicationServiceMock.createStartContract().capabilities,
            [casesFeatureId]: {
              /* intentionally empty */
            },
          },
        },
      },
    };
    const { result } = renderHook(() => useGetUserCasesPermissions(), {});
    expect(result.current?.read).toBe(false);
    expect(result.current?.crud).toBe(false);
  });

  it('returns false when capabilities entry is missing entirely', () => {
    mockUseKibanaReturnValue = {
      ...mockUseKibanaReturnValue,
      services: {
        ...mockUseKibanaReturnValue.services,
        application: {
          ...mockUseKibanaReturnValue.services.application,
          capabilities: {
            ...applicationServiceMock.createStartContract().capabilities,
          },
        },
      },
    };
    const { result } = renderHook(() => useGetUserCasesPermissions(), {});
    expect(result.current?.read).toBe(false);
    expect(result.current?.crud).toBe(false);
  });
});
