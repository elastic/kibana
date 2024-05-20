/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

import { useActions } from './use_actions';

describe('Transform: Transform List Actions', () => {
  test('useActions()', async () => {
    const queryClient = new QueryClient();
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, waitForNextUpdate } = renderHook(
      () => useActions({ forceDisable: false, transformNodes: 1 }),
      { wrapper }
    );

    await waitForNextUpdate();

    const actions = result.current.actions;

    // Using `any` for the callback. Somehow the EUI types don't pass
    // on the `data-test-subj` attribute correctly. We're interested
    // in the runtime result here anyway.
    expect(actions.map((a: any) => a['data-test-subj'])).toStrictEqual([
      'transformActionDiscover',
      'transformActionCreateAlertRule',
      'transformActionScheduleNow',
      'transformActionStart',
      'transformActionStop',
      'transformActionEdit',
      'transformActionClone',
      'transformActionDelete',
      'transformActionReauthorize',
      'transformActionReset',
    ]);
  });
});
