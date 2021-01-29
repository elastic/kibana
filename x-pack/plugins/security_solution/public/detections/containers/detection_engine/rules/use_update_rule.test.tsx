/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useUpdateRule, ReturnUpdateRule } from './use_update_rule';
import { getUpdateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';

jest.mock('./api');

describe('useUpdateRule', () => {
  test('init', async () => {
    const { result } = renderHook<unknown, ReturnUpdateRule>(() => useUpdateRule());

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('saving rule with isLoading === true', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<void, ReturnUpdateRule>(() =>
        useUpdateRule()
      );
      await waitForNextUpdate();
      result.current[1](getUpdateRulesSchemaMock());
      rerender();
      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('saved rule with isSaved === true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnUpdateRule>(() =>
        useUpdateRule()
      );
      await waitForNextUpdate();
      result.current[1](getUpdateRulesSchemaMock());
      await waitForNextUpdate();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });
});
