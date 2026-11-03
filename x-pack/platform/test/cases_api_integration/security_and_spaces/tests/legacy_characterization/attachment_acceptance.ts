/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { bulkCreateAttachments, createCase, deleteAllCaseItems } from '../../../common/lib/api';
import { getPostCaseRequest } from '../../../common/lib/mock';

const ALERT_TYPES = [
  { type: 'stack.alert', typeOwner: 'cases' },
  { type: 'security.alert', typeOwner: 'securitySolution' },
  { type: 'observability.alert', typeOwner: 'observability' },
] as const;

const OWNERS = ['cases', 'securitySolution', 'observability'] as const;

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('attachment acceptance per owner', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const owner of OWNERS) {
      for (const { type, typeOwner } of ALERT_TYPES) {
        const accepted = owner === typeOwner;

        it(`${accepted ? 'accepts' : 'rejects'} ${type} on a ${owner} case`, async () => {
          const theCase = await createCase(supertest, getPostCaseRequest({ owner }));
          await bulkCreateAttachments({
            supertest,
            caseId: theCase.id,
            params: [
              {
                type,
                attachmentId: `alert-${owner}-${type}`,
                metadata: {
                  index: '.internal.alerts-test-index',
                  rule: { id: 'rule-1', name: 'Rule' },
                },
                owner,
              },
            ],
            expectedHttpCode: accepted ? 200 : 400,
          });
        });
      }
    }
  });
};
