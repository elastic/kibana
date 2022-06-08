/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../common/mock';
import { ID, useNetworkUsers } from '.';
import { NetworkType } from '../../store/model';
import { FlowTargetSourceDest } from '../../../../common/search_strategy';

describe('useNetworkUsers', () => {
  it('skip = true will cancel any running request', () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    const localProps = {
      docValueFields: [],
      id: `${ID}-${NetworkType.page}`,
      ip: '1.1.1.1',
      flowTarget: FlowTargetSourceDest.source,
      startDate: '2020-07-07T08:20:18.966Z',
      endDate: '2020-07-08T08:20:18.966Z',
      indexNames: ['cool'],
      type: NetworkType.page,
      skip: false,
    };
    const { rerender } = renderHook(() => useNetworkUsers(localProps), {
      wrapper: TestProviders,
    });
    localProps.skip = true;
    act(() => rerender());
    expect(abortSpy).toHaveBeenCalledTimes(4);
  });
});
