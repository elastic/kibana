/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useCreateRule, ReturnCreateRule } from './use_create_rule';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { getRulesSchemaMock } from '../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { TestProviders } from '../../../../common/mock';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');

describe('useCreateRule', () => {
  (useAppToasts as jest.Mock).mockReturnValue(useAppToastsMock.create());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('init', async () => {
    const { result } = renderHook<unknown, ReturnCreateRule>(() => useCreateRule(), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual([{ isLoading: false, ruleId: null }, result.current[1]]);
  });

  test('saving rule with isLoading === true', async () => {
    await act(async () => {
      const { result, rerender, waitForNextUpdate } = renderHook<void, ReturnCreateRule>(
        () => useCreateRule(),
        {
          wrapper: TestProviders,
        }
      );
      await waitForNextUpdate();
      result.current[1](getCreateRulesSchemaMock());
      rerender();
      expect(result.current).toEqual([{ isLoading: true, ruleId: null }, result.current[1]]);
    });
  });

  test('updates ruleId after the rule has been saved', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnCreateRule>(
        () => useCreateRule(),
        {
          wrapper: TestProviders,
        }
      );
      await waitForNextUpdate();
      result.current[1](getCreateRulesSchemaMock());
      await waitForNextUpdate();
      expect(result.current).toEqual([
        { isLoading: false, ruleId: getRulesSchemaMock().id },
        result.current[1],
      ]);
    });
  });
});
