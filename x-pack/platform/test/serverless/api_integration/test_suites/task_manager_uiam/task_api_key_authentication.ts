/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { SupertestWithRoleScopeType } from '../../services';
import type { FtrProviderContext } from '../../ftr_provider_context';

const UIAM_PROVISIONING_TASK_ID = 'uiam_api_key_provisioning';

interface AuthenticationOutcome {
  authenticated: boolean;
  username: string | null;
  apiKeyId: string | null;
  error: string | null;
  ran: boolean;
}

/**
 * Verifies that a task authenticates against Elasticsearch with the UIAM API key Task Manager
 * persisted for it, for both ways a task can get one:
 *
 * - granted when the task is scheduled, and
 * - backfilled by the UIAM provisioning task, which converts a task's existing Elasticsearch API
 *   key into a UIAM one.
 *
 * The provisioned case regressed: the convert path stored `base64(<id>:<secret>)` while execution
 * presented the stored value verbatim, so Elasticsearch resolved it as a native `id:api_key` pair
 * and rejected every run of every affected task.
 *
 * The fixture task reports the id of the key Elasticsearch authenticated it with, so each
 * assertion pins down *which* of the task's two credentials was used, not merely that the run
 * succeeded.
 */
export default function ({ getService }: FtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const retry = getService('retry');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertest: SupertestWithRoleScopeType;

  /**
   * Recurring with a long interval: the task runs once on schedule, then its next run is far
   * enough out that the saved object (and the state carrying the run outcome) sticks around
   * instead of being deleted like a completed one-shot task, and that the UIAM provisioning task
   * considers it — provisioning skips tasks that are about to run.
   */
  const scheduleTask = async ({ onEsKey }: { onEsKey?: boolean } = {}) => {
    const { body, status } = await supertest
      .post('/api/sample_tasks/schedule_with_api_key')
      .set(samlAuth.getInternalRequestHeader())
      .send({
        task: {
          taskType: 'sampleTaskAuthenticatingWithItsOwnCredential',
          schedule: { interval: '1h' },
          params: {},
          state: {},
        },
        ...(onEsKey === undefined ? {} : { onEsKey }),
      });

    expect(status).toBe(200);
    return body.id as string;
  };

  const getTask = async (taskId: string) => {
    const { body, status } = await supertest
      .get(`/api/sample_tasks/task/${taskId}`)
      .set(samlAuth.getInternalRequestHeader());

    expect(status).toBe(200);
    return body;
  };

  const runSoon = async (taskId: string) => {
    const { status } = await supertest
      .post('/api/sample_tasks/run_soon')
      .set(samlAuth.getInternalRequestHeader())
      .send({ task: { id: taskId } });

    expect(status).toBe(200);
  };

  /** Waits until the task has reported a run made with the expected credential. */
  const expectAuthenticatedWith = async (taskId: string, expectedApiKeyId: string) =>
    retry.try(async () => {
      const { state } = await getTask(taskId);
      const outcome = state as AuthenticationOutcome;

      expect(outcome.ran).toBe(true);
      expect(outcome.apiKeyId).toBe(expectedApiKeyId);
      expect(outcome.error).toBeNull();
      expect(outcome.authenticated).toBe(true);
      expect(outcome.username).toEqual(expect.any(String));
    });

  describe('task API key authentication', function () {
    before(async () => {
      supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        useCookieHeader: true,
      });
    });

    it('authenticates with a UIAM API key granted when the task was scheduled', async () => {
      const taskId = await scheduleTask();

      const { userScope } = await getTask(taskId);
      expect(userScope?.uiamApiKeyId).toEqual(expect.any(String));

      await expectAuthenticatedWith(taskId, userScope.uiamApiKeyId);
    });

    it('authenticates with a UIAM API key backfilled by the provisioning task', async () => {
      // `onEsKey` skips the UIAM grant, leaving the task in the pre-UIAM state that the
      // provisioning task exists to fix up.
      const taskId = await scheduleTask({ onEsKey: true });

      const scheduled = await getTask(taskId);
      expect(scheduled.userScope?.uiamApiKeyId).toBeUndefined();
      expect(scheduled.userScope?.apiKeyId).toEqual(expect.any(String));

      // Until the key is converted the task authenticates with its Elasticsearch API key.
      await expectAuthenticatedWith(taskId, scheduled.userScope.apiKeyId);

      await runSoon(UIAM_PROVISIONING_TASK_ID);

      const uiamApiKeyId = await retry.try(async () => {
        const { userScope } = await getTask(taskId);
        expect(userScope?.uiamApiKeyId).toEqual(expect.any(String));
        return userScope.uiamApiKeyId as string;
      });

      await runSoon(taskId);

      // …and once it has one, that UIAM key is what reaches Elasticsearch.
      await expectAuthenticatedWith(taskId, uiamApiKeyId);
    });
  });
}
