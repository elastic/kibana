/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useRule, ReturnRule } from './use_rule';
import * as api from './api';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');

describe('useRule', () => {
  (useAppToasts as jest.Mock).mockReturnValue(useAppToastsMock.create());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnRule>(() =>
        useRule('myOwnRuleID')
      );
      await waitForNextUpdate();
      expect(result.current).toEqual([true, null]);
    });
  });

  test('fetch rule', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnRule>(() =>
        useRule('myOwnRuleID')
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual([
        false,
        {
          actions: [],
          author: [],
          created_at: 'mm/dd/yyyyTHH:MM:sssz',
          created_by: 'mockUser',
          description: 'some desc',
          enabled: true,
          false_positives: [],
          filters: [],
          from: 'now-360s',
          id: '12345678987654321',
          immutable: false,
          index: [
            'apm-*-transaction*',
            'traces-apm*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          interval: '5m',
          language: 'kuery',
          name: 'Test rule',
          max_signals: 100,
          query: "user.email: 'root@elastic.co'",
          references: [],
          risk_score: 75,
          risk_score_mapping: [],
          rule_id: 'bbd3106e-b4b5-4d7c-a1a2-47531d6a2baf',
          severity: 'high',
          severity_mapping: [],
          tags: ['APM'],
          threat: [],
          throttle: null,
          to: 'now',
          type: 'query',
          updated_at: 'mm/dd/yyyyTHH:MM:sssz',
          updated_by: 'mockUser',
        },
      ]);
    });
  });

  test('fetch a new rule', async () => {
    const spyOnfetchRuleById = jest.spyOn(api, 'fetchRuleById');
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<string, ReturnRule>((id) => useRule(id), {
        initialProps: 'myOwnRuleID',
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      rerender('newRuleId');
      await waitForNextUpdate();
      expect(spyOnfetchRuleById).toHaveBeenCalledTimes(2);
    });
  });
});
