/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, cleanup } from '@testing-library/react-hooks';
import { useRuleStatus, ReturnRuleStatus } from './use_rule_status';
import * as api from './api';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');

describe('useRuleStatus', () => {
  (useAppToasts as jest.Mock).mockReturnValue(useAppToastsMock.create());

  beforeEach(() => {
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
              last_look_back_date: '2020-03-19T00:32:07.996Z', // NOTE: This is no longer used on the UI, but left here in case users are using it within the API
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
});
