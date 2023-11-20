/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../../../common/mock';
import { useManagedUserItems } from './use_managed_user_items';
import { mockEntraUser, mockOktaUser } from '../__mocks__';

describe('useManagedUserItems', () => {
  it('returns managed user items for Entra user', () => {
    const { result } = renderHook(() => useManagedUserItems(mockEntraUser), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual([
      {
        field: 'user.id',
        label: 'User ID',
        value: '123456',
      },
      {
        label: 'First name',
        value: 'Test',
      },
      {
        label: 'Last name',
        value: 'User',
      },
      {
        label: 'Phone',
        value: '123456',
      },
      {
        label: 'Job title',
        value: 'Unit tester',
      },
      {
        label: 'Work location',
        value: 'USA, CA',
      },
    ]);
  });

  it('returns managed user items for Okta user', () => {
    const { result } = renderHook(() => useManagedUserItems(mockOktaUser), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual([
      {
        field: 'user.id',
        label: 'User ID',
        value: '00ud9ohoh9ww644Px5d7',
      },
      {
        label: 'First name',
        value: 'Test',
      },
      {
        label: 'Last name',
        value: 'User',
      },
      {
        label: 'Phone',
        value: '123456',
      },
      {
        label: 'Job title',
        value: 'Unit tester',
      },
      {
        label: 'Work location',
        value: "A'dam, NL",
      },
    ]);
  });
});
