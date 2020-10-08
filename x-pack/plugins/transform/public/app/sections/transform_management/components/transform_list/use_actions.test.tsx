/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useActions } from './use_actions';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../../app/app_dependencies');

describe('Transform: Transform List Actions', () => {
  test('useActions()', () => {
    const { result } = renderHook(() => useActions({ forceDisable: false }));
    const actions = result.current.actions;

    // Using `any` for the callback. Somehow the EUI types don't pass
    // on the `data-test-subj` attribute correctly. We're interested
    // in the runtime result here anyway.
    expect(actions.map((a: any) => a['data-test-subj'])).toStrictEqual([
      'transformActionStart',
      'transformActionStop',
      'transformActionEdit',
      'transformActionClone',
      'transformActionDelete',
    ]);
  });
});
