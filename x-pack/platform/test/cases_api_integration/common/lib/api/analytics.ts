/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import {
  getCAIActivityBackfillTaskId,
  getCAIActivitySynchronizationTaskId,
  CAI_ACTIVITY_SOURCE_INDEX,
  getActivityDestinationIndexName,
  getActivitySourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/activity_index/constants';
import {
  getCAIAttachmentsBackfillTaskId,
  getCAIAttachmentsSynchronizationTaskId,
  CAI_ATTACHMENTS_SOURCE_INDEX,
  getAttachmentsDestinationIndexName,
  getAttachmentsSourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/attachments_index/constants';
import {
  getCAICasesBackfillTaskId,
  getCAICasesSynchronizationTaskId,
  CAI_CASES_SOURCE_INDEX,
  getCasesDestinationIndexName,
  getCasesSourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/cases_index/constants';
import {
  getCAICommentsBackfillTaskId,
  getCAICommentsSynchronizationTaskId,
  CAI_COMMENTS_SOURCE_INDEX,
  getCommentsDestinationIndexName,
  getCommentsSourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/comments_index/constants';

export const runCasesBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: getCAICasesBackfillTaskId('default', 'securitySolution'),
      sourceIndex: CAI_CASES_SOURCE_INDEX,
      destIndex: getCasesDestinationIndexName('default', 'securitySolution'),
      sourceQuery: JSON.stringify(getCasesSourceQuery('default', 'securitySolution')),
    })
    .expect(200);
};

export const runCasesSynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: getCAICasesSynchronizationTaskId('default', 'securitySolution') })
    .expect(200);
};

export const runAttachmentsBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: getCAIAttachmentsBackfillTaskId('default', 'securitySolution'),
      sourceIndex: CAI_ATTACHMENTS_SOURCE_INDEX,
      destIndex: getAttachmentsDestinationIndexName('default', 'securitySolution'),
      sourceQuery: JSON.stringify(getAttachmentsSourceQuery('default', 'securitySolution')),
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

export const runAttachmentsSynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: getCAIAttachmentsSynchronizationTaskId('default', 'securitySolution') })
    .expect(200);
};

export const runCommentsBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: getCAICommentsBackfillTaskId('default', 'securitySolution'),
      sourceIndex: CAI_COMMENTS_SOURCE_INDEX,
      destIndex: getCommentsDestinationIndexName('default', 'securitySolution'),
      sourceQuery: JSON.stringify(getCommentsSourceQuery('default', 'securitySolution')),
    })
    .expect(200);
};

export const runCommentsSynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: getCAICommentsSynchronizationTaskId('default', 'securitySolution') })
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

export const runActivitySynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: getCAIActivitySynchronizationTaskId('default', 'securitySolution') })
    .expect(200);
};
