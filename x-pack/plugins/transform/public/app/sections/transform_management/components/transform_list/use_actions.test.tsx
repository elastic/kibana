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
    const actions: ReturnType<typeof useActions>['actions'] = result.current.actions;

    expect(actions).toHaveLength(4);
    expect(typeof actions[0].render).toBe('function');
    expect(typeof actions[1].render).toBe('function');
    expect(typeof actions[2].render).toBe('function');
    expect(typeof actions[3].render).toBe('function');
  });
});
