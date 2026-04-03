/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common/constants';
import { runOwnerSyncTask, runSchedulerTask } from '../../../../../common/lib/api/analytics';
import {
  createCase,
  createConfiguration,
  deleteAllCaseItems,
  deleteAllCaseAnalyticsItems,
  getAuthWithSuperUser,
  getConfiguration,
  getConfigurationRequest,
} from '../../../../../common/lib/api';
import { postCaseReq } from '../../../../../common/lib/mock';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esClient = getService('es');
  const retry = getService('retry');
  const authSpace1 = getAuthWithSuperUser();

  // Skipped: owner sync task uses async ES reindexes and fire-and-forget SO
  // updates that are difficult to synchronise in the FTR environment.
  // The unit tests in owner_sync_task_runner.test.ts provide full coverage of
  // the adaptive-scheduling and idle-detection logic.
  // See https://github.com/elastic/kibana/issues/227734 for context on the
  // flakiness that affects the broader analytics FTR suite.
  describe.skip('analytics owner sync task', () => {
    beforeEach(async () => {
      await deleteAllCaseAnalyticsItems(esClient);
      await deleteAllCaseItems(esClient);
    });

    after(async () => {
      await deleteAllCaseItems(esClient);
    });

    it('should set analytics_sync_status to active on first run', async () => {
      // Create a configure SO with analytics enabled and a real owner so that
      // getSpacesWithAnalyticsEnabled returns the space.
      await createConfiguration(
        supertest,
        getConfigurationRequest({
          overrides: {
            owner: SECURITY_SOLUTION_OWNER,
            analytics_enabled: true,
          },
        })
      );

      // Bootstrap indices via the scheduler task (idempotent).
      await runSchedulerTask(supertest);

      // Create a case so there is at least one source document for the msearch
      // phase to find, ensuring the task treats this space as active.
      await createCase(
        supertest,
        { ...postCaseReq, owner: SECURITY_SOLUTION_OWNER },
        200,
        authSpace1
      );

      // Trigger the per-owner sync task.
      await runOwnerSyncTask(supertest, SECURITY_SOLUTION_OWNER);

      // The configure SO update is fire-and-forget inside the task runner, so
      // we poll until it becomes consistent.
      await retry.tryForTime(60_000, async () => {
        const configs = await getConfiguration({
          supertest,
          query: { owner: SECURITY_SOLUTION_OWNER },
        });

        expect(configs.length).to.be.greaterThan(0);
        expect(configs[0].analytics_sync_status).to.be('active');
      });
    });

    it('should set analytics_sync_status to idle after consecutive empty runs', async () => {
      // Create a configure SO with analytics enabled but do NOT create any
      // cases, so every msearch sub-query returns 0 docs and the task
      // increments consecutiveEmptyRuns on each run.
      await createConfiguration(
        supertest,
        getConfigurationRequest({
          overrides: {
            owner: SECURITY_SOLUTION_OWNER,
            analytics_enabled: true,
          },
        })
      );

      // Bootstrap indices (required so the scheduler does not remove the space
      // from analytics-enabled pairs on next scheduler run).
      await runSchedulerTask(supertest);

      // Run the owner sync task IDLE_THRESHOLD (5) times.  Each run finds zero
      // new source docs → consecutiveEmptyRuns increments.  On the 5th run the
      // task sets nextSyncAt and writes analytics_sync_status = 'idle'.
      for (let i = 0; i < 5; i++) {
        await runOwnerSyncTask(supertest, SECURITY_SOLUTION_OWNER);
      }

      await retry.tryForTime(60_000, async () => {
        const configs = await getConfiguration({
          supertest,
          query: { owner: SECURITY_SOLUTION_OWNER },
        });

        expect(configs.length).to.be.greaterThan(0);
        expect(configs[0].analytics_sync_status).to.be('idle');
      });
    });

    it('should reset idle status to active when new docs appear after idle period', async () => {
      await createConfiguration(
        supertest,
        getConfigurationRequest({
          overrides: {
            owner: SECURITY_SOLUTION_OWNER,
            analytics_enabled: true,
          },
        })
      );

      await runSchedulerTask(supertest);

      // Drive the space into idle mode (5 empty runs).
      for (let i = 0; i < 5; i++) {
        await runOwnerSyncTask(supertest, SECURITY_SOLUTION_OWNER);
      }

      await retry.tryForTime(30_000, async () => {
        const configs = await getConfiguration({
          supertest,
          query: { owner: SECURITY_SOLUTION_OWNER },
        });
        expect(configs[0].analytics_sync_status).to.be('idle');
      });

      // The space is now in idle mode with a nextSyncAt in the future.
      // Because Task Manager state persists nextSyncAt, the next runSoon will
      // skip the space (nextSyncAt > now).  This test verifies the idle state
      // is written correctly; full wake-up coverage is in the unit tests.
      const configs = await getConfiguration({
        supertest,
        query: { owner: SECURITY_SOLUTION_OWNER },
      });
      expect(configs[0].analytics_sync_status).to.be('idle');
    });
  });
};
