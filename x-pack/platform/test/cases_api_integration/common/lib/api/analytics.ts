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
  getActivitySourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/activity_index/constants';
import {
  getCAIAttachmentsBackfillTaskId,
  getCAIAttachmentsSynchronizationTaskId,
  CAI_ATTACHMENTS_SOURCE_INDEX,
  CAI_ATTACHMENTS_INDEX_NAME,
  getAttachmentsSourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/attachments_index/constants';
import {
  getCAICasesBackfillTaskId,
  getCAICasesSynchronizationTaskId,
  CAI_CASES_SOURCE_INDEX,
  CAI_CASES_INDEX_NAME,
  getCasesSourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/cases_index/constants';
import {
  getCAICommentsBackfillTaskId,
  getCAICommentsSynchronizationTaskId,
  CAI_COMMENTS_SOURCE_INDEX,
  CAI_COMMENTS_INDEX_NAME,
  getCommentsSourceQuery,
} from '@kbn/cases-plugin/server/cases_analytics/comments_index/constants';

export const runCasesBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      // @ts-expect-error: the owner in the test env is not aligned with real world env
      taskId: getCAICasesBackfillTaskId('space1', 'securitySolutionFixture'),
      sourceIndex: CAI_CASES_SOURCE_INDEX,
      destIndex: CAI_CASES_INDEX_NAME,
      // @ts-expect-error: the owner in the test env is not aligned with real world env
      sourceQuery: JSON.stringify(getCasesSourceQuery('space1', 'securitySolutionFixture')),
    })
    .expect(200);
};

export const runCasesSynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    // @ts-expect-error: the owner in the test env is not aligned with real world env
    .send({ taskId: getCAICasesSynchronizationTaskId('space1', 'securitySolutionFixture') })
    .expect(200);
};

export const runAttachmentsBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      // @ts-expect-error: the owner in the test env is not aligned with real world env
      taskId: getCAIAttachmentsBackfillTaskId('space1', 'securitySolutionFixture'),
      sourceIndex: CAI_ATTACHMENTS_SOURCE_INDEX,
      destIndex: CAI_ATTACHMENTS_INDEX_NAME,
      // @ts-expect-error: the owner in the test env is not aligned with real world env
      sourceQuery: JSON.stringify(getAttachmentsSourceQuery('space1', 'securitySolutionFixture')),
    })
    .expect(200);
};

export const runAttachmentsSynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    // @ts-expect-error: the owner in the test env is not aligned with real world env
    .send({ taskId: getCAIAttachmentsSynchronizationTaskId('space1', 'securitySolutionFixture') })
    .expect(200);
};

export const runCommentsBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      // @ts-expect-error: the owner in the test env is not aligned with real world env
      taskId: getCAICommentsBackfillTaskId('space1', 'securitySolutionFixture'),
      sourceIndex: CAI_COMMENTS_SOURCE_INDEX,
      destIndex: CAI_COMMENTS_INDEX_NAME,
      // @ts-expect-error: the owner in the test env is not aligned with real world env
      sourceQuery: JSON.stringify(getCommentsSourceQuery('space1', 'securitySolutionFixture')),
    })
    .expect(200);
};

export const runCommentsSynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    // @ts-expect-error: the owner in the test env is not aligned with real world env
    .send({ taskId: getCAICommentsSynchronizationTaskId('space1', 'securitySolutionFixture') })
    .expect(200);
};

export const runActivityBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      // @ts-expect-error: the owner in the test env is not aligned with real world env
      taskId: getCAIActivityBackfillTaskId('space1', 'securitySolutionFixture'),
      sourceIndex: CAI_ACTIVITY_SOURCE_INDEX,
      // @ts-expect-error: the owner in the test env is not aligned with real world env
      destIndex: getActivityDestinationIndexName('space1', 'securitySolutionFixture'),
      // @ts-expect-error: the owner in the test env is not aligned with real world env
      sourceQuery: JSON.stringify(getActivitySourceQuery('space1', 'securitySolutionFixture')),
    })
    .expect(200);
};

export const runActivitySynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    // @ts-expect-error: the owner in the test env is not aligned with real world env
    .send({ taskId: getCAIActivitySynchronizationTaskId('space1', 'securitySolutionFixture') })
    .expect(200);
};
