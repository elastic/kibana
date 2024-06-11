/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH } from '@kbn/alerting-plugin/common';
import { act, renderHook } from '@testing-library/react-hooks';
import moment from 'moment';
import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { useScheduleRuleRun } from './use_schedule_rule_run';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

describe('When using the `useScheduleRuleRun()` hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send schedule rule run request', async () => {
    const { result, waitFor } = renderHook(() => useScheduleRuleRun(), {
      wrapper: TestProviders,
    });

    const timeRange = { startDate: moment().subtract(1, 'd'), endDate: moment() };
    act(() => {
      result.current.scheduleRuleRun({ ruleIds: ['rule-1'], timeRange });
    });

    await waitFor(() => (useKibanaMock().services.http.fetch as jest.Mock).mock.calls.length > 0);

    expect(useKibanaMock().services.http.fetch).toHaveBeenCalledWith(
      INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH,
      expect.objectContaining({
        body: `[{"rule_id":"rule-1","start":"${timeRange.startDate.toISOString()}","end":"${timeRange.endDate.toISOString()}"}]`,
      })
    );
  });
});
