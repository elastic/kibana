/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import {
  CAI_ACTIVITY_BACKFILL_TASK_ID,
  CAI_ACTIVITY_SYNCHRONIZATION_TASK_ID,
  CAI_ACTIVITY_SOURCE_INDEX,
  CAI_ACTIVITY_INDEX_NAME,
  CAI_ACTIVITY_SOURCE_QUERY,
} from '@kbn/cases-plugin/server/cases_analytics/activity_index/constants';
import {
  CAI_ATTACHMENTS_BACKFILL_TASK_ID,
  CAI_ATTACHMENTS_SYNCHRONIZATION_TASK_ID,
  CAI_ATTACHMENTS_SOURCE_INDEX,
  CAI_ATTACHMENTS_INDEX_NAME,
  CAI_ATTACHMENTS_SOURCE_QUERY,
} from '@kbn/cases-plugin/server/cases_analytics/attachments_index/constants';
import {
  CAI_CASES_BACKFILL_TASK_ID,
  CAI_CASES_SYNCHRONIZATION_TASK_ID,
  CAI_CASES_SOURCE_INDEX,
  CAI_CASES_INDEX_NAME,
  CAI_CASES_SOURCE_QUERY,
} from '@kbn/cases-plugin/server/cases_analytics/cases_index/constants';
import {
  CAI_COMMENTS_BACKFILL_TASK_ID,
  CAI_COMMENTS_SYNCHRONIZATION_TASK_ID,
  CAI_COMMENTS_SOURCE_INDEX,
  CAI_COMMENTS_INDEX_NAME,
  CAI_COMMENTS_SOURCE_QUERY,
} from '@kbn/cases-plugin/server/cases_analytics/comments_index/constants';

export const runCasesBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: CAI_CASES_BACKFILL_TASK_ID,
      sourceIndex: CAI_CASES_SOURCE_INDEX,
      destIndex: CAI_CASES_INDEX_NAME,
      sourceQuery: JSON.stringify(CAI_CASES_SOURCE_QUERY),
    })
    .expect(200);
};

export const runCasesSynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: CAI_CASES_SYNCHRONIZATION_TASK_ID })
    .expect(200);
};

export const runAttachmentsBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: CAI_ATTACHMENTS_BACKFILL_TASK_ID,
      sourceIndex: CAI_ATTACHMENTS_SOURCE_INDEX,
      destIndex: CAI_ATTACHMENTS_INDEX_NAME,
      sourceQuery: JSON.stringify(CAI_ATTACHMENTS_SOURCE_QUERY),
    })
    .expect(200);
};

export const runAttachmentsSynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: CAI_ATTACHMENTS_SYNCHRONIZATION_TASK_ID })
    .expect(200);
};

export const runCommentsBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: CAI_COMMENTS_BACKFILL_TASK_ID,
      sourceIndex: CAI_COMMENTS_SOURCE_INDEX,
      destIndex: CAI_COMMENTS_INDEX_NAME,
      sourceQuery: JSON.stringify(CAI_COMMENTS_SOURCE_QUERY),
    })
    .expect(200);
};

export const runCommentsSynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: CAI_COMMENTS_SYNCHRONIZATION_TASK_ID })
    .expect(200);
};

export const runActivityBackfillTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/backfill/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({
      taskId: CAI_ACTIVITY_BACKFILL_TASK_ID,
      sourceIndex: CAI_ACTIVITY_SOURCE_INDEX,
      destIndex: CAI_ACTIVITY_INDEX_NAME,
      sourceQuery: JSON.stringify(CAI_ACTIVITY_SOURCE_QUERY),
    })
    .expect(200);
};

export const runActivitySynchronizationTask = async (supertest: SuperTest.Agent) => {
  await supertest
    .post('/api/analytics_index/synchronization/run_soon')
    .set('kbn-xsrf', 'xxx')
    .send({ taskId: CAI_ACTIVITY_SYNCHRONIZATION_TASK_ID })
    .expect(200);
};
