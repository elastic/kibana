/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { act } from '@testing-library/react';
import { useScheduleRuleRunMutation } from './use_schedule_rule_run_mutation';
import { renderMutation } from '../../../../management/hooks/test_utils';
import { scheduleRuleRunMock } from '../../logic/__mocks__/mock';
import { INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH } from '@kbn/alerting-plugin/common';

import { KibanaServices } from '../../../../common/lib/kibana';

const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

const apiVersion = '2023-10-31';

describe('Schedule rule run hook', () => {
  let result: ReturnType<typeof useScheduleRuleRunMutation>;

  beforeEach(() => {
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(scheduleRuleRunMock);
  });

  it('schedules a rule run by calling the backfill API', async () => {
    result = await renderMutation(() => useScheduleRuleRunMutation());

    expect(fetchMock).toHaveBeenCalledTimes(0);

    const timeRange = { startDate: moment().subtract(1, 'd'), endDate: moment() };

    await act(async () => {
      const res = await result.mutateAsync({ ruleIds: ['rule-1'], timeRange });
      expect(res).toEqual(scheduleRuleRunMock);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH, {
        body: `[{"rule_id":"rule-1","start":"${timeRange.startDate.toISOString()}","end":"${timeRange.endDate.toISOString()}"}]`,
        method: 'POST',
        version: apiVersion,
      });
    });
  });
});
