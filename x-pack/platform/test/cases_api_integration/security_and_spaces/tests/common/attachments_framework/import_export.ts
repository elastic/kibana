/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { join } from 'path';
import type { SavedObject } from '@kbn/core/server';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
} from '@kbn/cases-plugin/common/constants';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  bulkCreateAttachments,
  deleteAllCaseItems,
  findCases,
  findAttachments,
} from '../../../../common/lib/api';

const ndjsonToObject = (input: string): SavedObject[] =>
  input
    .split('\n')
    .filter((str) => str.trim().length > 0)
    .map((str) => JSON.parse(str));

/**
 * Locks in that the unified `cases-attachments` SO survives saved-object
 * import/export. #277091 only made the shared `cases/import_export.ts`
 * flag-agnostic; this asserts the new SO type round-trips with the flag ON.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertestService = getService('supertest');
  const es = getService('es');

  describe('unified attachment import and export (feature flag ON)', () => {
    const actionsRemover = new ActionsRemover(supertestService);

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    it('exports a case whose attachment is a unified cases-attachments SO', async () => {
      const postedCase = await createCase(supertestService, getPostCaseRequest());
      await bulkCreateAttachments({
        supertest: supertestService,
        caseId: postedCase.id,
        params: [
          {
            type: 'comment' as const,
            data: { content: 'unified comment to export' },
            owner: 'securitySolutionFixture',
          },
        ],
      });

      const { text } = await supertestService
        .post(`/api/saved_objects/_export`)
        .send({ type: ['cases'], excludeExportDetails: true, includeReferencesDeep: true })
        .set('kbn-xsrf', 'true');

      const objects = ndjsonToObject(text);

      const unifiedSOs = objects.filter((so) => so.type === CASE_ATTACHMENT_SAVED_OBJECT);
      expect(unifiedSOs.length).to.eql(1);

      // With the flag ON the attachment must not round-trip as the legacy SO.
      const legacySOs = objects.filter((so) => so.type === CASE_COMMENT_SAVED_OBJECT);
      expect(legacySOs.length).to.eql(0);
    });

    it('imports a cases-attachments ndjson fixture and reads the attachment back', async () => {
      await supertestService
        .post('/api/saved_objects/_import')
        .query({ overwrite: true })
        .attach(
          'file',
          join(
            __dirname,
            '../../../../common/fixtures/saved_object_exports/single_case_with_unified_attachment.ndjson'
          )
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      const findResponse = await findCases({ supertest: supertestService, query: {} });
      expect(findResponse.total).to.eql(1);
      expect(findResponse.cases[0].title).to.eql('A case with a unified attachment');

      const commentsResponse = await findAttachments({
        supertest: supertestService,
        caseId: findResponse.cases[0].id,
      });
      expect(commentsResponse.comments.length).to.eql(1);

      const comment = commentsResponse.comments[0] as Record<string, unknown>;
      const content =
        (comment.data as { content?: string } | undefined)?.content ?? comment.comment;
      expect(content).to.eql('A unified comment for my case');
    });
  });
};
