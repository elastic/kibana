/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { TaskRunnerTimer, TaskRunnerTimerSpan } from './task_runner_timer';

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('TaskRunnerTimer', () => {
  let timer: TaskRunnerTimer;

  beforeEach(() => {
    jest.resetAllMocks();
    timer = new TaskRunnerTimer({ logger: mockLogger });
  });

  describe('setDuration', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2020-03-09').getTime());
    });

    afterAll(() => {
      jest.useRealTimers();
    });
    test('should calculate duration as now - given start date for given timer span', () => {
      timer.setDuration(TaskRunnerTimerSpan.StartTaskRun, new Date('2020-03-06'));
      expect(timer.toJson()).toEqual({
        claim_to_start_duration_ms: 259200000,
        persist_alerts_duration_ms: 0,
        prepare_rule_duration_ms: 0,
        process_alerts_duration_ms: 0,
        process_rule_duration_ms: 0,
        rule_type_run_duration_ms: 0,
        total_run_duration_ms: 0,
        trigger_actions_duration_ms: 0,
      });
    });

    test('should log warning and overwrite duration if called twice for same span', () => {
      timer.setDuration(TaskRunnerTimerSpan.StartTaskRun, new Date('2020-03-06'));
      timer.setDuration(TaskRunnerTimerSpan.StartTaskRun, new Date('2020-03-04'));
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Duration already exists for \"claim_to_start_duration_ms\" and will be overwritten`
      );
      expect(timer.toJson()).toEqual({
        claim_to_start_duration_ms: 432000000,
        persist_alerts_duration_ms: 0,
        prepare_rule_duration_ms: 0,
        process_alerts_duration_ms: 0,
        process_rule_duration_ms: 0,
        rule_type_run_duration_ms: 0,
        total_run_duration_ms: 0,
        trigger_actions_duration_ms: 0,
      });
    });
  });

  describe('runWithTimer', () => {
    test('should calculate time it takes to run callback function for a given timer span', async () => {
      const delay = 2000;
      const result = await timer.runWithTimer(TaskRunnerTimerSpan.ProcessAlerts, async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return 'done!';
      });

      expect(result).toEqual('done!');

      // We would expect this to be greater than the delay value but add a fudge factor to avoid flakiness
      expect(timer.toJson().process_alerts_duration_ms).toBeGreaterThanOrEqual(delay - 5);
    });

    test('should log warning and overwrite duration if called twice for same span', async () => {
      const prevDelay = 2000;
      const delay = 1000;
      await timer.runWithTimer(TaskRunnerTimerSpan.ProcessAlerts, async () => {
        await new Promise((resolve) => setTimeout(resolve, prevDelay));
        return 'done!';
      });
      await timer.runWithTimer(TaskRunnerTimerSpan.ProcessAlerts, async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return 'done!';
      });

      // We would expect this to be greater than the delay value but add a fudge factor to avoid flakiness
      expect(timer.toJson().process_alerts_duration_ms).toBeGreaterThanOrEqual(delay - 5);
      expect(timer.toJson().process_alerts_duration_ms).toBeLessThan(prevDelay);
    });
  });
});
