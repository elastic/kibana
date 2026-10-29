/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  findCases,
  removeServerGeneratedPropertiesFromCase,
} from '../../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('post_case', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should filter out empty assignee.uid values', async () => {
      const randomUid = '7f3e9d2a-1b8c-4c5f-9e6d-8f2a4b1d3c7e';
      const createdCase = await createCase(
        supertest,
        getPostCaseRequest({
          assignees: [{ uid: '' }, { uid: randomUid }],
        })
      );

      const data = removeServerGeneratedPropertiesFromCase(createdCase);

      expect(data.assignees).to.eql([{ uid: randomUid }]);
    });

    describe('extractObservables owner rule', () => {
      // The real owners are used on purpose: the fixture owners are not in the owner table,
      // so the server does not guard them.
      const ownersThatCannotAutoExtract = ['cases', 'observability'];

      for (const owner of ownersThatCannotAutoExtract) {
        describe(`owner ${owner}`, () => {
          it('rejects extractObservables true with a 400 and creates no case', async () => {
            const response = await createCase(
              supertest,
              getPostCaseRequest({
                owner,
                settings: { syncAlerts: true, extractObservables: true },
              }),
              400
            );

            expect((response as unknown as { message: string }).message).to.contain(
              `Setting extractObservables to true is not allowed for the "${owner}" owner`
            );

            const { total } = await findCases({ supertest, query: { owner } });
            expect(total).to.be(0);
          });

          it('accepts extractObservables false', async () => {
            const createdCase = await createCase(
              supertest,
              getPostCaseRequest({
                owner,
                settings: { syncAlerts: true, extractObservables: false },
              })
            );

            expect(createdCase.settings.extractObservables).to.be(false);
          });

          it('stores false when extractObservables is omitted', async () => {
            const createdCase = await createCase(
              supertest,
              getPostCaseRequest({ owner, settings: { syncAlerts: true } })
            );

            expect(createdCase.settings.extractObservables).to.be(false);
          });
        });
      }

      describe('owner securitySolution', () => {
        it('accepts extractObservables true', async () => {
          const createdCase = await createCase(
            supertest,
            getPostCaseRequest({
              owner: 'securitySolution',
              settings: { syncAlerts: true, extractObservables: true },
            })
          );

          expect(createdCase.settings.extractObservables).to.be(true);
        });

        it('accepts extractObservables false', async () => {
          const createdCase = await createCase(
            supertest,
            getPostCaseRequest({
              owner: 'securitySolution',
              settings: { syncAlerts: true, extractObservables: false },
            })
          );

          expect(createdCase.settings.extractObservables).to.be(false);
        });
      });
    });
  });
};
