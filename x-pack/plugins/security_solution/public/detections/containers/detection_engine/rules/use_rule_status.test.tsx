/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act, cleanup } from '@testing-library/react-hooks';
import {
  useRuleStatus,
  ReturnRuleStatus,
  useRulesStatuses,
  ReturnRulesStatuses,
} from './use_rule_status';
import * as api from './api';
import { Rule } from './types';

jest.mock('./api');

const testRule: Rule = {
  actions: [
    {
      group: 'fake group',
      id: 'fake id',
      action_type_id: 'fake action_type_id',
      params: {
        someKey: 'someVal',
      },
    },
  ],
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
};

describe('useRuleStatus', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  afterEach(async () => {
    cleanup();
  });

  describe('useRuleStatus', () => {
    test('init', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, ReturnRuleStatus>(() =>
          useRuleStatus('myOwnRuleID')
        );
        await waitForNextUpdate();
        expect(result.current).toEqual([true, null, null]);
      });
    });

    test('fetch rule status', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, ReturnRuleStatus>(() =>
          useRuleStatus('myOwnRuleID')
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current).toEqual([
          false,
          {
            current_status: {
              alert_id: 'alertId',
              last_failure_at: null,
              last_failure_message: null,
              last_success_at: 'mm/dd/yyyyTHH:MM:sssz',
              last_success_message: 'it is a success',
              status: 'succeeded',
              status_date: 'mm/dd/yyyyTHH:MM:sssz',
              gap: null,
              bulk_create_time_durations: ['2235.01'],
              search_after_time_durations: ['616.97'],
              last_look_back_date: '2020-03-19T00:32:07.996Z',
            },
            failures: [],
          },
          result.current[2],
        ]);
      });
    });

    test('re-fetch rule status', async () => {
      const spyOngetRuleStatusById = jest.spyOn(api, 'getRuleStatusById');
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, ReturnRuleStatus>(() =>
          useRuleStatus('myOwnRuleID')
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        if (result.current[2]) {
          result.current[2]('myOwnRuleID');
        }
        await waitForNextUpdate();
        expect(spyOngetRuleStatusById).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('useRulesStatuses', () => {
    test('init rules statuses', async () => {
      const payload = [testRule];
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, ReturnRulesStatuses>(() =>
          useRulesStatuses(payload)
        );
        await waitForNextUpdate();
        expect(result.current).toEqual({ loading: false, rulesStatuses: [] });
      });
    });

    test('fetch rules statuses', async () => {
      const payload = [testRule];
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, ReturnRulesStatuses>(() =>
          useRulesStatuses(payload)
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current).toEqual({
          loading: false,
          rulesStatuses: [
            {
              current_status: {
                alert_id: 'alertId',
                bulk_create_time_durations: ['2235.01'],
                gap: null,
                last_failure_at: null,
                last_failure_message: null,
                last_look_back_date: '2020-03-19T00:32:07.996Z',
                last_success_at: 'mm/dd/yyyyTHH:MM:sssz',
                last_success_message: 'it is a success',
                search_after_time_durations: ['616.97'],
                status: 'succeeded',
                status_date: 'mm/dd/yyyyTHH:MM:sssz',
              },
              failures: [],
              id: '12345678987654321',
              activate: true,
              name: 'Test rule',
            },
          ],
        });
      });
    });
  });
});
