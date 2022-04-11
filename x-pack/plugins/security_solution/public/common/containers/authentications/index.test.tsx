/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { AuthStackByField } from '../../../../common/search_strategy';
import { TestProviders } from '../../../common/mock';
import { HostsType } from '../../../hosts/store/model';
import { useAuthentications } from './index';

describe('authentications', () => {
  it('skip = true will cancel any running request', () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    const localProps = {
      startDate: '2020-07-07T08:20:18.966Z',
      endDate: '2020-07-08T08:20:18.966Z',
      indexNames: ['cool'],
      type: HostsType.page,
      skip: false,
      stackByField: AuthStackByField.hostName,
      activePage: 0,
      limit: 10,
    };
    const { rerender } = renderHook(() => useAuthentications(localProps), {
      wrapper: TestProviders,
    });
    localProps.skip = true;
    act(() => rerender());
    expect(abortSpy).toHaveBeenCalledTimes(4);
  });
});
