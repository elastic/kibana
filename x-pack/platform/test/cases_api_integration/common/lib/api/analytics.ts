/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import {
  getCAIActivityBackfillTaskId,
  CAI_ACTIVITY_SOURCE_INDEX,
  getActivityDestinationIndexName,
  getActivitySourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/activity_index/constants';
import {
  getCAIAttachmentsBackfillTaskId,
  CAI_ATTACHMENTS_SOURCE_INDEX,
  getAttachmentsDestinationIndexName,
  getAttachmentsSourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/attachments_index/constants';
import {
  getCAICasesBackfillTaskId,
  CAI_CASES_SOURCE_INDEX,
  getCasesDestinationIndexName,
  getCasesSourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/cases_index/constants';
import {
  getCAICommentsBackfillTaskId,
  CAI_COMMENTS_SOURCE_INDEX,
  getCommentsDestinationIndexName,
  getCommentsSourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/comments_index/constants';
import { getSynchronizationTaskId } from '@kbn/cases-plugin/server/cases_analytics/tasks/synchronization_task';

// The plugin schedules a one-time backfill under its own task id when it creates an index, and
// ensureScheduled on that id keeps the pending task's runAt, so a run-now backfill needs a fresh id.
const getRunNowBackfillTaskId = (taskId: string): string => `${taskId}-${uuidv4()}`;

export const runCasesBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: getRunNowBackfillTaskId(getCAICasesBackfillTaskId('default', 'securitySolution')),
      sourceIndex: CAI_CASES_SOURCE_INDEX,
      destIndex: getCasesDestinationIndexName('default', 'securitySolution'),
      sourceQuery: JSON.stringify(getCasesSourceQuery('default', 'securitySolution')),
    })
    .expect(200);
};

export const runCAISynchronizationTask = async (
  supertest: SuperTest.Agent,
  spaceId: string = 'default'
) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: getSynchronizationTaskId(spaceId, 'securitySolution') })
    .expect(200);
};

export const runAttachmentsBackfillTask = async (
  supertest: SuperTest.Agent,
  spaceId: string = 'default',
  owner: 'cases' | 'observability' | 'securitySolution' = 'securitySolution'
) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: getRunNowBackfillTaskId(getCAIAttachmentsBackfillTaskId(spaceId, owner)),
      sourceIndex: CAI_ATTACHMENTS_SOURCE_INDEX,
      destIndex: getAttachmentsDestinationIndexName(spaceId, owner),
      sourceQuery: JSON.stringify(getAttachmentsSourceQuery(spaceId, owner)),
    })
    .expect(200);
};

export const runSchedulerTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/scheduler/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send()
    .expect(200);
};

export const runCommentsBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: getRunNowBackfillTaskId(getCAICommentsBackfillTaskId('default', 'securitySolution')),
      sourceIndex: CAI_COMMENTS_SOURCE_INDEX,
      destIndex: getCommentsDestinationIndexName('default', 'securitySolution'),
      sourceQuery: JSON.stringify(getCommentsSourceQuery('default', 'securitySolution')),
    })
    .expect(200);
};

export const runActivityBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: getRunNowBackfillTaskId(getCAIActivityBackfillTaskId('default', 'securitySolution')),
      sourceIndex: CAI_ACTIVITY_SOURCE_INDEX,
      destIndex: getActivityDestinationIndexName('default', 'securitySolution'),
      sourceQuery: JSON.stringify(getActivitySourceQuery('default', 'securitySolution')),
    })
    .expect(200);
};
