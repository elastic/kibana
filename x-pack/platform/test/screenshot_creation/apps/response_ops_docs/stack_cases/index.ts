/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import { createAndUploadFile } from '../../../../cases_api_integration/common/lib/api';
import { CASES_FILE_KIND } from '../../../../cases_api_integration/common/lib/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

export const caseTitle = 'Web transactions';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const cases = getService('cases');
  const supertest = getService('supertest');

  describe('stack cases', function () {
    before(async () => {
      const { id: caseId, owner: caseOwner } = await cases.api.createCase({
        title: caseTitle,
        tags: ['e-commerce'],
        description: 'Investigate e-commerce sample data.',
      });
      await cases.api.createAttachment({
        caseId,
        params: { comment: 'test comment', type: AttachmentType.user, owner: caseOwner },
      });
      await createAndUploadFile({
        supertest,
        createFileParams: {
          name: 'testfile',
          kind: CASES_FILE_KIND,
          mimeType: 'image/png',
          meta: {
            caseIds: [caseId],
            owner: [caseOwner],
          },
        },
        data: 'abc',
      });
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    loadTestFile(require.resolve('./list_view'));
    loadTestFile(require.resolve('./settings'));
    loadTestFile(require.resolve('./details_view'));
  });
}
