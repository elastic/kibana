/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

import { useActions } from './use_actions';

describe('Transform: Transform List Actions', () => {
  test('useActions()', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useActions({ forceDisable: false, transformNodes: 1 })
    );

    await waitForNextUpdate();

    const actions = result.current.actions;

    // Using `any` for the callback. Somehow the EUI types don't pass
    // on the `data-test-subj` attribute correctly. We're interested
    // in the runtime result here anyway.
    expect(actions.map((a: any) => a['data-test-subj'])).toStrictEqual([
      'transformActionDiscover',
      'transformActionCreateAlertRule',
      'transformActionStart',
      'transformActionStop',
      'transformActionEdit',
      'transformActionClone',
      'transformActionDelete',
      'transformActionReset',
    ]);
  });
});
