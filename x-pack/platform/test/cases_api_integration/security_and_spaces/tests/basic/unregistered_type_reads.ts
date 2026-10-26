/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CASE_COMMENT_SAVED_OBJECT,
  LEGACY_ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
  ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { postCaseReq } from '../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  findAttachmentsV2,
  getAttachmentV2,
} from '../../../common/lib/api';

/**
 * ML registers its attachment types only on platinum+, so on basic the type is missing from
 * the registry. A stored ML row must still read back in unified shape.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const seedLegacyMlSwimlane = async (caseId: string): Promise<string> => {
    const seededId = 'ml-swimlane-seeded-legacy';
    await es.index({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: `${CASE_COMMENT_SAVED_OBJECT}:${seededId}`,
      refresh: 'wait_for',
      document: {
        type: CASE_COMMENT_SAVED_OBJECT,
        [CASE_COMMENT_SAVED_OBJECT]: {
          type: 'persistableState',
          owner: 'securitySolutionFixture',
          persistableStateAttachmentTypeId: LEGACY_ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
          persistableStateAttachmentState: { jobIds: ['job-1'] },
          created_at: '2024-01-01T00:00:00.000Z',
          created_by: { username: 'elastic', full_name: null, email: null },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
        references: [{ type: 'cases', id: caseId, name: 'associated-cases' }],
        namespaces: ['default'],
        updated_at: '2024-01-01T00:00:00.000Z',
        coreMigrationVersion: '8.8.0',
      },
    });
    return seededId;
  };

  describe('reads of attachment types not registered on basic', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('returns a stored ML swimlane in unified shape from get', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const seededId = await seedLegacyMlSwimlane(postedCase.id);

      const attachment = await getAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId: seededId,
      });

      expect(attachment.id).to.be(seededId);
      expect(attachment.type).to.be(ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE);
    });

    it('returns a stored ML swimlane in unified shape from find', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const seededId = await seedLegacyMlSwimlane(postedCase.id);

      const attachments = await findAttachmentsV2({ supertest, caseId: postedCase.id });

      expect(attachments.data.map(({ id, type }) => ({ id, type }))).to.eql([
        { id: seededId, type: ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE },
      ]);
    });
  });
};
