/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../../../common/mock';
import { mockObservedUser } from '../__mocks__';
import { useObservedUserItems } from './use_observed_user_items';

describe('useManagedUserItems', () => {
  it('returns managed user items for Entra user', () => {
    const { result } = renderHook(() => useObservedUserItems(mockObservedUser), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual([
      {
        field: 'user.id',
        label: 'User ID',
        values: ['1234', '321'],
      },
      {
        field: 'user.domain',
        label: 'Domain',
        values: ['test domain', 'another test domain'],
      },
      {
        field: 'anomalies',
        label: 'Max anomaly score by job',
        values: mockObservedUser.anomalies,
      },
      {
        field: '@timestamp',
        label: 'First seen',
        values: ['2023-02-23T20:03:17.489Z'],
      },
      {
        field: '@timestamp',
        label: 'Last seen',
        values: ['2023-02-23T20:03:17.489Z'],
      },
      {
        field: 'host.os.name',
        label: 'Operating system',
        values: ['testOs'],
      },
      {
        field: 'host.os.family',
        label: 'Family',
        values: ['testFamily'],
      },
      {
        field: 'host.ip',
        label: 'IP addresses',
        values: ['10.0.0.1', '127.0.0.1'],
      },
    ]);
  });
});
