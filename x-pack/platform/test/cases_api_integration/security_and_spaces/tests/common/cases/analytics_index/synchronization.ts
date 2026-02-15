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
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import {
  runCAISynchronizationTask,
  runSchedulerTask,
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
  deleteAllCaseAnalyticsItems,
} from '../../../../../common/lib/api';
import {
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

  // Failing: See https://github.com/elastic/kibana/issues/227734
  describe.skip('analytics indexes synchronization task', () => {
    beforeEach(async () => {
      await deleteAllCaseAnalyticsItems(esClient);
      await deleteAllCaseItems(esClient);
      await deleteAllFiles({
        supertest,
        auth: authSpace1,
      });

      // make sure the indexes are created before each test
      await createCase(supertest, postCaseReq, 200);
      await createCase(supertest, postCaseReq, 200, authSpace1);
      await runSchedulerTask(supertest);
    });

    after(async () => {
      await deleteAllCaseItems(esClient);
    });

    // This test passes locally but fails in the flaky test runner.
    // Increasing the timeout did not work.
    it('should sync the cases index', async () => {
      await createConfiguration(
        supertest,
        getConfigurationRequest({
          overrides: {
            owner: SECURITY_SOLUTION_OWNER,
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

      const caseToBackfill = await createCase(
        supertest,
        {
          ...postCaseReq,
          category: 'foobar',
          customFields: [
            {
              key: 'test_custom_field',
              type: CustomFieldTypes.TEXT,
              value: 'value',
            },
          ],
          owner: SECURITY_SOLUTION_OWNER,
        },
        200
      );

      await runCAISynchronizationTask(supertest);

      await retry.tryForTime(300000, async () => {
        const caseAnalytics = await esClient.get({
          index: '.internal.cases.securitysolution-default',
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
          owner: 'securitySolution',
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

    it('should sync the cases attachments index', async () => {
      const postedCase = await createCase(
        supertest,
        {
          ...postCaseReq,
          owner: SECURITY_SOLUTION_OWNER,
        },
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

      await runCAISynchronizationTask(supertest);

      await retry.tryForTime(300000, async () => {
        const firstAttachmentAnalytics = await esClient.get({
          index: '.internal.cases-attachments.securitysolution-space1',
          id: `cases-comments:${postedCaseWithAttachments.comments![0].id}`,
        });

        expect(firstAttachmentAnalytics.found).to.be(true);

        const secondAttachmentAnalytics = await esClient.get({
          index: '.internal.cases-attachments.securitysolution-space1',
          id: `cases-comments:${postedCaseWithAttachments.comments![1].id}`,
        });

        expect(secondAttachmentAnalytics.found).to.be(true);
      });
    });

    it('should sync the cases comments index', async () => {
      const postedCase = await createCase(
        supertest,
        { ...postCaseReq, owner: SECURITY_SOLUTION_OWNER },
        200
      );
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: { ...postCommentUserReq, owner: SECURITY_SOLUTION_OWNER },
      });

      await runCAISynchronizationTask(supertest);

      await retry.try(async () => {
        const commentAnalytics = await esClient.get({
          index: '.internal.cases-comments.securitysolution-default',
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
          owner: 'securitySolution',
          space_ids: ['default'],
        });
      });
    });

    it('should sync the activity index', async () => {
      const postedCase = await createCase(
        supertest,
        { ...postCaseReq, owner: SECURITY_SOLUTION_OWNER },
        200
      );
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

      await runCAISynchronizationTask(supertest);

      let activityArray: any[] = [];
      await retry.try(async () => {
        const activityAnalytics = await esClient.search({
          index: '.internal.cases-activity.securitysolution-default',
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
      expect(categoryActivity?._source.owner).to.be('securitySolution');
      expect(categoryActivity?._source.action).to.be('update');
      expect(categoryActivity?._source.case_id).to.be(postedCase.id);
      expect(categoryActivity?._source.payload?.category).to.be('categoryValue');

      const severityActivity = activityArray.find(
        (activity) => activity._source.type === 'severity'
      );
      expect(severityActivity?._source.owner).to.be('securitySolution');
      expect(severityActivity?._source.action).to.be('update');
      expect(severityActivity?._source.case_id).to.be(postedCase.id);
      expect(severityActivity?._source.payload?.severity).to.be('medium');

      const statusActivity = activityArray.find((activity) => activity._source.type === 'status');
      expect(statusActivity?._source.owner).to.be('securitySolution');
      expect(statusActivity?._source.action).to.be('update');
      expect(statusActivity?._source.case_id).to.be(postedCase.id);
      expect(statusActivity?._source.payload?.status).to.be('in-progress');
    });
  });
};
