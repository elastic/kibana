/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { mockObservedUser } from '../mocks';
import { TestProviders } from '../../../../common/mock';
import { useObservedUserItems } from './use_observed_user_items';

describe('useManagedUserItems', () => {
  it('returns observed user fields', () => {
    const { result } = renderHook(() => useObservedUserItems(mockObservedUser), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual([
      {
        field: 'user.id',
        label: 'User ID',
        getValues: expect.any(Function),
      },
      {
        field: 'user.domain',
        label: 'Domain',
        getValues: expect.any(Function),
      },
      {
        label: 'First seen',
        render: expect.any(Function),
      },
      {
        label: 'Last seen',
        render: expect.any(Function),
      },
      {
        field: 'host.os.name',
        label: 'Operating system',
        getValues: expect.any(Function),
      },
      {
        field: 'host.os.family',
        label: 'Family',

        getValues: expect.any(Function),
      },
      {
        field: 'host.ip',
        label: 'IP addresses',

        getValues: expect.any(Function),
      },
      {
        label: 'Max anomaly score by job',
        isVisible: expect.any(Function),
        render: expect.any(Function),
      },
    ]);

    expect(result.current.map(({ getValues }) => getValues && getValues(mockObservedUser))).toEqual(
      [
        ['1234', '321'], // id
        ['test domain', 'another test domain'], // domain
        undefined, // First seen doesn't implement getValues
        undefined, // Last seen doesn't implement getValues
        ['testOs'], // OS name
        ['testFamily'], // os family
        ['10.0.0.1', '127.0.0.1'], // IP addresses
        undefined, // Max anomaly score by job doesn't implement getValues
      ]
    );
  });
});
