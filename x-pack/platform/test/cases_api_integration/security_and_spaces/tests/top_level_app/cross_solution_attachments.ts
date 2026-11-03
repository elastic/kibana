/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  bulkCreateAttachments,
  createCase,
  deleteAllCaseItems,
  getAlertsAttachedToCase,
} from '../../../common/lib/api';
import { getPostCaseRequest } from '../../../common/lib/mock';

const ALERT_TYPES = ['stack.alert', 'security.alert', 'observability.alert'] as const;
const OWNERS = ['cases', 'securitySolution', 'observability'] as const;

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('attachments across solutions', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const owner of OWNERS) {
      it(`accepts every solution's alerts on a ${owner} case and lists them all`, async () => {
        const theCase = await createCase(supertest, getPostCaseRequest({ owner }));
        await bulkCreateAttachments({
          supertest,
          caseId: theCase.id,
          params: ALERT_TYPES.map((type) => ({
            type,
            attachmentId: `alert-${type}`,
            metadata: {
              index: '.internal.alerts-test-index',
              rule: { id: 'rule-1', name: 'Rule' },
            },
            owner,
          })),
        });

        const alerts = await getAlertsAttachedToCase({ supertest, caseId: theCase.id });
        expect(alerts.map(({ id }) => id).sort()).to.eql(
          ALERT_TYPES.map((type) => `alert-${type}`).sort()
        );
      });
    }
  });
};
