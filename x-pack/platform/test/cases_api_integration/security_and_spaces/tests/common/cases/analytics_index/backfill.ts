/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CaseSeverity,
  CaseStatuses,
  CustomFieldTypes,
} from '@kbn/cases-plugin/common/types/domain';
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common/constants';
import {
  runActivityBackfillTask,
  runAttachmentsBackfillTask,
  runCasesBackfillTask,
  runCommentsBackfillTask,
} from '../../../../../common/lib/api/analytics';
import {
  createCase,
  createConfiguration,
  createComment,
  createFileAttachment,
  deleteAllCaseItems,
  deleteAllFiles,
  getAuthWithSuperUser,
  getConfigurationRequest,
  updateCase,
  deleteCases,
  deleteAllCaseAnalyticsItems,
} from '../../../../../common/lib/api';
import {
  getPostCaseRequest,
  postCaseReq,
  postFileReq,
  postCommentAlertReq,
  postCommentUserReq,
} from '../../../../../common/lib/mock';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esClient = getService('es');
  const retry = getService('retry');
  const authSpace1 = getAuthWithSuperUser();

  describe('analytics indexes backfill task', () => {
    beforeEach(async () => {
      await deleteAllCaseAnalyticsItems(esClient);
      await deleteAllCaseItems(esClient);
      await deleteAllFiles({
        supertest,
        auth: authSpace1,
      });
    });

    after(async () => {
      await deleteAllCaseItems(esClient);
    });

    it('should backfill the cases index', async () => {
      await createConfiguration(
        supertest,
        getConfigurationRequest({
          overrides: {
            customFields: [
              {
                key: 'test_custom_field',
                label: 'text',
                type: CustomFieldTypes.TEXT,
                required: false,
              },
            ],
          },
        })
      );

      const postCaseRequest = getPostCaseRequest({
        category: 'foobar',
        customFields: [
          {
            key: 'test_custom_field',
            type: CustomFieldTypes.TEXT,
            value: 'value',
          },
        ],
      });

      const caseToBackfill = await createCase(supertest, postCaseRequest, 200);

      await runCasesBackfillTask(supertest);

      await retry.try(async () => {
        const caseAnalytics = await esClient.get({
          index: '.internal.cases',
          id: `cases:${caseToBackfill.id}`,
        });

        expect(caseAnalytics.found).to.be(true);

        const {
          '@timestamp': timestamp,
          created_at: createdAt,
          created_at_ms: createdAtMs,
          ...analyticsFields
        } = caseAnalytics._source as any;

        expect(timestamp).not.to.be(null);
        expect(timestamp).not.to.be(undefined);
        expect(createdAt).not.to.be(null);
        expect(createdAt).not.to.be(undefined);
        expect(createdAtMs).not.to.be(null);
        expect(createdAtMs).not.to.be(undefined);

        expect(analyticsFields).to.eql({
          assignees: [],
          category: 'foobar',
          created_by: {
            email: null,
            full_name: null,
            profile_uid: null,
            username: 'elastic',
          },
          custom_fields: [
            {
              key: 'test_custom_field',
              type: 'text',
              value: 'value',
            },
          ],
          description: 'This is a brand new case of a bad meanie defacing data',
          observables: [],
          owner: 'securitySolutionFixture',
          severity: 'low',
          severity_sort: 0,
          space_ids: ['default'],
          status: 'open',
          status_sort: 0,
          tags: ['defacement'],
          title: 'Super Bad Security Issue',
          total_alerts: 0,
          total_assignees: 0,
          total_comments: 0,
        });
      });
    });

    // This test passes locally but fails in the flaky test runner.
    // Increasing the timeout did not work.
    it.skip('should backfill the cases attachments index', async () => {
      const postedCase = await createCase(
        supertest,
        { ...postCaseReq, owner: SECURITY_SOLUTION_OWNER },
        200,
        authSpace1
      );

      await createFileAttachment({
        supertest,
        caseId: postedCase.id,
        params: postFileReq,
        auth: authSpace1,
      });

      const postedCaseWithAttachments = await createComment({
        supertest,
        caseId: postedCase.id,
        params: {
          ...postCommentAlertReq,
          alertId: 'test-id-2',
          index: 'test-index-2',
          owner: SECURITY_SOLUTION_OWNER,
        },
        auth: authSpace1,
      });

      await runAttachmentsBackfillTask(supertest);

      await retry.tryForTime(300000, async () => {
        const firstAttachmentAnalytics = await esClient.get({
          index: '.internal.cases-attachments',
          id: `cases-comments:${postedCaseWithAttachments.comments![0].id}`,
        });

        expect(firstAttachmentAnalytics.found).to.be(true);
      });

      const secondAttachmentAnalytics = await esClient.get({
        index: '.internal.cases-attachments',
        id: `cases-comments:${postedCaseWithAttachments.comments![1].id}`,
      });

      expect(secondAttachmentAnalytics.found).to.be(true);
    });

    it('should backfill the cases comments index', async () => {
      const postedCase = await createCase(supertest, postCaseReq, 200);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      await runCommentsBackfillTask(supertest);

      await retry.try(async () => {
        const commentAnalytics = await esClient.get({
          index: '.internal.cases-comments',
          id: `cases-comments:${patchedCase.comments![0].id}`,
        });

        expect(commentAnalytics.found).to.be(true);

        const {
          '@timestamp': timestamp,
          created_at: createdAt,
          case_id: caseId,
          ...analyticsFields
        } = commentAnalytics._source as any;

        expect(caseId).to.be(postedCase.id);

        expect(timestamp).not.to.be(null);
        expect(timestamp).not.to.be(undefined);
        expect(createdAt).not.to.be(null);
        expect(createdAt).not.to.be(undefined);

        expect(analyticsFields).to.eql({
          comment: 'This is a cool comment',
          created_by: {
            email: null,
            full_name: null,
            username: 'elastic',
          },
          owner: 'securitySolutionFixture',
          space_ids: ['default'],
        });
      });
    });

    it('should backfill the activity index', async () => {
      const postedCase = await createCase(supertest, postCaseReq, 200);
      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              tags: ['other'],
              severity: CaseSeverity.MEDIUM,
              category: 'categoryValue',
              status: CaseStatuses['in-progress'],
            },
          ],
        },
      });

      const caseToDelete = await createCase(supertest, getPostCaseRequest(), 200);
      await deleteCases({
        supertest,
        caseIDs: [caseToDelete.id],
      });

      await runActivityBackfillTask(supertest);

      let activityArray: any[] = [];
      await retry.try(async () => {
        const activityAnalytics = await esClient.search({
          index: '.internal.cases-activity',
        });

        // @ts-ignore
        expect(activityAnalytics.hits.total?.value).to.be(5);
        activityArray = activityAnalytics.hits.hits as unknown as any[];
      });

      const tagsActivity = activityArray.filter((activity) => activity._source.type === 'tags');
      expect(tagsActivity.length).to.be(2);

      const categoryActivity = activityArray.find(
        (activity) => activity._source.type === 'category'
      );
      expect(categoryActivity?._source.owner).to.be('securitySolutionFixture');
      expect(categoryActivity?._source.action).to.be('update');
      expect(categoryActivity?._source.case_id).to.be(postedCase.id);
      expect(categoryActivity?._source.payload?.category).to.be('categoryValue');

      const severityActivity = activityArray.find(
        (activity) => activity._source.type === 'severity'
      );
      expect(severityActivity?._source.owner).to.be('securitySolutionFixture');
      expect(severityActivity?._source.action).to.be('update');
      expect(severityActivity?._source.case_id).to.be(postedCase.id);
      expect(severityActivity?._source.payload?.severity).to.be('medium');

      const statusActivity = activityArray.find((activity) => activity._source.type === 'status');
      expect(statusActivity?._source.owner).to.be('securitySolutionFixture');
      expect(statusActivity?._source.action).to.be('update');
      expect(statusActivity?._source.case_id).to.be(postedCase.id);
      expect(statusActivity?._source.payload?.status).to.be('in-progress');
    });
  });
};
