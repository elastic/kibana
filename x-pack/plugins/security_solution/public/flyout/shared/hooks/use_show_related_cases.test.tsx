/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useGetUserCasesPermissions } from '../../../common/lib/kibana';
import { useShowRelatedCases } from './use_show_related_cases';
jest.mock('../../../common/lib/kibana');

describe('useShowRelatedCases', () => {
  it(`should return false if user doesn't have cases read privilege`, () => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
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
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
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
