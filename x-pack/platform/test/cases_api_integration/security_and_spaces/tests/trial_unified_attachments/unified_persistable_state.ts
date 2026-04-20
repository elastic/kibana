/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  LENS_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { postCaseReq } from '../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  bulkCreateAttachments,
  getComment,
  deleteComment,
} from '../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Unified Persistable State — lens/ML/AIOps CRUD with flag ON', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('Lens', () => {
      const lensPayload = {
        type: LENS_ATTACHMENT_TYPE,
        data: {
          state: {
            attributes: { title: 'My visualization' },
            timeRange: { from: 'now-15m', to: 'now' },
          },
        },
        owner: 'securitySolutionFixture',
      };

      it('creates a lens attachment via v2 payload', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [lensPayload],
        });

        expect(updatedCase.comments?.length).to.be(1);

        const attachment = updatedCase.comments![0];
        expect(['lens', 'persistableState']).to.contain(attachment.type);
      });

      it('writes lens to cases-attachments SO when flag is ON', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [lensPayload],
        });

        const attachmentId = updatedCase.comments![0].id;

        const unifiedSOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${attachmentId}` } },
              ],
            },
          },
        });

        expect(unifiedSOs.hits.hits.length).to.be(1);

        const legacySOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_COMMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_COMMENT_SAVED_OBJECT}:${attachmentId}` } },
              ],
            },
          },
        });

        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('retrieves lens attachment by id', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [lensPayload],
        });

        const attachmentId = updatedCase.comments![0].id;
        const fetched = await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: attachmentId,
        });

        expect(fetched.id).to.be(attachmentId);
        expect(['lens', 'persistableState']).to.contain(fetched.type);
      });

      it('can be retrieved individually after creation', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [lensPayload],
        });

        const attachmentId = updatedCase.comments![0].id;
        const fetched = await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: attachmentId,
        });

        expect(fetched.id).to.be(attachmentId);
        expect(fetched.owner).to.be('securitySolutionFixture');
      });

      it('deletes lens attachment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [lensPayload],
        });

        const attachmentId = updatedCase.comments![0].id;
        await deleteComment({
          supertest,
          caseId: postedCase.id,
          commentId: attachmentId,
        });

        await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: attachmentId,
          expectedHttpCode: 404,
        });
      });
    });

    // TODO: Enable when https://github.com/elastic/kibana/pull/262597 is merged
    describe.skip('ML anomaly swimlane', () => {
      const mlPayload = {
        type: 'ml.anomaly_swimlane',
        data: {
          state: {
            jobIds: ['test-job-1'],
            swimlaneType: 'overall',
          },
        },
        owner: 'securitySolutionFixture',
      };

      it('creates an ML anomaly swimlane attachment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [mlPayload],
        });

        expect(updatedCase.comments?.length).to.be(1);
        expect(['ml.anomaly_swimlane', 'persistableState']).to.contain(
          updatedCase.comments![0].type
        );
      });

      it('retrieves ML attachment by id', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [mlPayload],
        });

        const fetched = await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: updatedCase.comments![0].id,
        });

        expect(['ml.anomaly_swimlane', 'persistableState']).to.contain(fetched.type);
      });
    });

    // TODO: Enable when https://github.com/elastic/kibana/pull/262597 is merged
    describe.skip('AIOps change point chart', () => {
      const aiopsPayload = {
        type: 'aiops.change_point_chart',
        data: {
          state: {
            dataViewId: 'test-data-view',
            fn: 'avg',
            metricField: 'response_time',
            splitField: 'host.name',
          },
        },
        owner: 'securitySolutionFixture',
      };

      it('creates an AIOps change point chart attachment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [aiopsPayload],
        });

        expect(updatedCase.comments?.length).to.be(1);
        expect(['aiops.change_point_chart', 'persistableState']).to.contain(
          updatedCase.comments![0].type
        );
      });

      it('retrieves AIOps attachment by id', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [aiopsPayload],
        });

        const fetched = await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: updatedCase.comments![0].id,
        });

        expect(['aiops.change_point_chart', 'persistableState']).to.contain(fetched.type);
      });
    });

    // TODO: Enable when https://github.com/elastic/kibana/pull/262597 is merged
    describe.skip('mixed persistable state types', () => {
      it('creates lens and ML in bulk on the same case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: LENS_ATTACHMENT_TYPE,
              data: { state: { attributes: { title: 'viz 1' } } },
              owner: 'securitySolutionFixture',
            },
            {
              type: 'ml.anomaly_swimlane',
              data: { state: { jobIds: ['job-1'] } },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        expect(updatedCase.comments?.length).to.be(2);
      });
    });
  });
};
