/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockObservedHostData } from '../../../../timelines/components/side_panel/new_host_detail/__mocks__';
import { renderHook } from '@testing-library/react-hooks';
import { useObservedHostFields } from './use_observed_host_fields';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';

describe('useManagedUserItems', () => {
  it('returns managed user items for Entra user', () => {
    const { result } = renderHook(() => useObservedHostFields(mockObservedHostData), {
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
