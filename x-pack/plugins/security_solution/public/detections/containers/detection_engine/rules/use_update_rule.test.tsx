/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useUpdateRule, ReturnUpdateRule } from './use_update_rule';
import { getUpdateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { TestProviders } from '../../../../common/mock';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');

describe('useUpdateRule', () => {
  (useAppToasts as jest.Mock).mockReturnValue(useAppToastsMock.create());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('init', async () => {
    const { result } = renderHook<unknown, ReturnUpdateRule>(() => useUpdateRule(), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('saving rule with isLoading === true', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<void, ReturnUpdateRule>(
        () => useUpdateRule(),
        {
          wrapper: TestProviders,
        }
      );
      await waitForNextUpdate();
      result.current[1](getUpdateRulesSchemaMock());
      rerender();
      expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);
    });
  });

  test('saved rule with isSaved === true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnUpdateRule>(
        () => useUpdateRule(),
        {
          wrapper: TestProviders,
        }
      );
      await waitForNextUpdate();
      result.current[1](getUpdateRulesSchemaMock());
      await waitForNextUpdate();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });
});
