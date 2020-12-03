/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useCreateRule, ReturnCreateRule } from './use_create_rule';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';

jest.mock('./api');

describe('useCreateRule', () => {
  test('init', async () => {
    const { result } = renderHook<unknown, ReturnCreateRule>(() => useCreateRule());

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('saving rule with isLoading === true', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<void, ReturnCreateRule>(() =>
        useCreateRule()
      );
      await waitForNextUpdate();
      result.current[1](getCreateRulesSchemaMock());
      rerender();
      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('saved rule with isSaved === true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnCreateRule>(() =>
        useCreateRule()
      );
      await waitForNextUpdate();
      result.current[1](getCreateRulesSchemaMock());
      await waitForNextUpdate();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });
});
