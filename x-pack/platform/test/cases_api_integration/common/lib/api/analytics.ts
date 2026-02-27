/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import {
  getCAIActivityBackfillTaskId,
  CAI_ACTIVITY_SOURCE_INDEX,
  getActivityDestinationIndexName,
  getActivitySourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/activity_index/constants';
import {
  getCAIContentBackfillTaskId,
  CAI_CONTENT_SOURCE_INDEX,
  getContentDestinationIndexName,
  getContentSourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/content_index/constants';
import { getSynchronizationTaskId } from '@kbn/cases-plugin/server/cases_analytics/tasks/synchronization_task';

/** Triggers the content backfill task (cases + comments + attachments) for the default space. */
export const runContentBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: getCAIContentBackfillTaskId('default', 'securitySolution'),
      sourceIndex: CAI_CONTENT_SOURCE_INDEX,
      destIndex: getContentDestinationIndexName('default', 'securitySolution'),
      sourceQuery: JSON.stringify(getContentSourceQuery('default', 'securitySolution')),
    })
    .expect(200);
};

export const runCAISynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: getSynchronizationTaskId('default', 'securitySolution') })
    .expect(200);
};

export const runSchedulerTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/scheduler/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send()
    .expect(200);
};

export const runActivityBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: getCAIActivityBackfillTaskId('default', 'securitySolution'),
      sourceIndex: CAI_ACTIVITY_SOURCE_INDEX,
      destIndex: getActivityDestinationIndexName('default', 'securitySolution'),
      sourceQuery: JSON.stringify(getActivitySourceQuery('default', 'securitySolution')),
    })
    .expect(200);
};

// ---------------------------------------------------------------------------
// Deprecated aliases — kept so that existing skipped tests continue to compile.
// New code should use runContentBackfillTask instead.
// ---------------------------------------------------------------------------

/** @deprecated Use runContentBackfillTask — cases, comments, and attachments are now in one index. */
export const runCasesBackfillTask = runContentBackfillTask;
/** @deprecated Use runContentBackfillTask — cases, comments, and attachments are now in one index. */
export const runAttachmentsBackfillTask = runContentBackfillTask;
/** @deprecated Use runContentBackfillTask — cases, comments, and attachments are now in one index. */
export const runCommentsBackfillTask = runContentBackfillTask;
