/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

// Spelled out rather than imported from the plugin because both values are persisted -- the id as
// the task saved object id, the type in every event log document it produces -- so a change to
// either is a breaking change that this test should catch.
const TELEMETRY_TASK_ID = 'task_manager_snapshot_telemetry';
const TELEMETRY_TASK_TYPE = 'task_manager:snapshot_telemetry';

interface SnapshotTelemetryState {
  has_errors: boolean;
  error_messages?: string[];
  runs: number;
  total_task_runs_24hr?: number;
  task_runs_by_type_24hr?: Array<{ name: string; value: number }>;
  task_runs_other_24hr?: number;
  schedule_delay_ms_24hr?: Record<string, number | null>;
}

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');

  describe('snapshot telemetry', () => {
    function runTaskSoon(id: string) {
      return supertest
        .post('/api/sample_tasks/run_soon')
        .set('kbn-xsrf', 'xxx')
        .send({ task: { id } })
        .expect(200)
        .then((response) => response.body);
    }

    function currentTask(id: string): Promise<{
      status: string;
      taskType: string;
      schedule?: { interval: string };
      state: SnapshotTelemetryState;
    }> {
      return supertest
        .get(`/api/sample_tasks/task/${id}`)
        .expect(200)
        .then((response) => response.body);
    }

    async function countTaskRunStartEvents(taskType: string) {
      const response = await es.search({
        index: '.kibana-event-log*',
        ignore_unavailable: true,
        size: 0,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              { term: { 'event.provider': 'taskManager' } },
              { term: { 'event.action': 'task-run-start' } },
              { term: { 'kibana.task.type': taskType } },
            ],
          },
        },
      });

      return typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;
    }

    it('is scheduled on startup as a daily singleton task', async () => {
      const task = await currentTask(TELEMETRY_TASK_ID);

      // Task Manager schedules this task once, during plugin start, and nothing reschedules it, so
      // an undefined taskType here means a preceding suite wiped the saved object indices rather than
      // the task failing to be scheduled.
      expect(task.taskType).to.eql(TELEMETRY_TASK_TYPE);
      expect(task.schedule).to.eql({ interval: '1d' });
    });

    it('aggregates task execution volume and schedule delay from the event log', async () => {
      // The telemetry task emits a task-run-start event of its own on every run
      await runTaskSoon(TELEMETRY_TASK_ID);

      await retry.try(async () => {
        expect(await countTaskRunStartEvents(TELEMETRY_TASK_TYPE)).to.be.greaterThan(0);
      });

      // A collection only sees events the event log had already indexed when it ran, so keep asking
      // for a fresh one until it reflects the run above.
      await retry.try(async () => {
        await runTaskSoon(TELEMETRY_TASK_ID);

        const { status, state } = await currentTask(TELEMETRY_TASK_ID);
        expect(status).to.eql('idle');
        expect(state.runs).to.be.greaterThan(0);
        expect(state.has_errors).to.eql(false);
        expect(state.error_messages).to.be(undefined);

        const byType = state.task_runs_by_type_24hr ?? [];
        const telemetryTaskBucket = byType.find(({ name }) => name === TELEMETRY_TASK_TYPE);
        expect(telemetryTaskBucket).to.be.ok();
        expect(telemetryTaskBucket!.value).to.be.greaterThan(0);

        // The breakdown is capped to the highest volume task types, so it only reconciles against
        // the total once the remainder reported in task_runs_other_24hr is added back.
        const summed = byType.reduce((sum, { value }) => sum + value, 0);
        expect(summed + state.task_runs_other_24hr!).to.eql(state.total_task_runs_24hr);

        expect(Object.keys(state.schedule_delay_ms_24hr ?? {}).sort()).to.eql([
          'p50',
          'p75',
          'p95',
          'p99',
        ]);
      });
    });
  });
}
