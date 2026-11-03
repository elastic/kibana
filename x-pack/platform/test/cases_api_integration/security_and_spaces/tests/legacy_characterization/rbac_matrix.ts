/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  deleteCases,
  findCases,
  getCase,
  updateCase,
} from '../../../common/lib/api';
import { getPostCaseRequest } from '../../../common/lib/mock';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../common/lib/authentication';
import type { Role, User } from '../../../common/lib/authentication/types';

const OWNERS = ['cases', 'securitySolution', 'observability'] as const;

const LEGACY_FEATURES = [
  { featureId: 'generalCases', owner: 'cases' },
  { featureId: 'generalCasesV2', owner: 'cases' },
  { featureId: 'generalCasesV3', owner: 'cases' },
  { featureId: 'securitySolutionCases', owner: 'securitySolution' },
  { featureId: 'securitySolutionCasesV2', owner: 'securitySolution' },
  { featureId: 'securitySolutionCasesV3', owner: 'securitySolution' },
  { featureId: 'observabilityCases', owner: 'observability' },
  { featureId: 'observabilityCasesV2', owner: 'observability' },
  { featureId: 'observabilityCasesV3', owner: 'observability' },
] as const;

const PRIVILEGES = ['all', 'read'] as const;

const roleName = (featureId: string, privilege: string) => `legacy_${featureId}_${privilege}`;

const matrix = LEGACY_FEATURES.flatMap(({ featureId, owner }) =>
  PRIVILEGES.map((privilege) => {
    const role: Role = {
      name: roleName(featureId, privilege),
      privileges: {
        elasticsearch: { indices: [{ names: ['*'], privileges: ['all'] }] },
        kibana: [{ feature: { [featureId]: [privilege] }, spaces: ['*'] }],
      },
    };
    const user: User = {
      username: `${roleName(featureId, privilege)}_user`,
      password: 'changeme',
      roles: [role.name],
    };
    return { featureId, owner, privilege, role, user };
  })
);

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('RBAC matrix for legacy Cases features', () => {
    before(async () => {
      await createUsersAndRoles(
        getService,
        matrix.map(({ user }) => user),
        matrix.map(({ role }) => role)
      );
    });

    after(async () => {
      await deleteUsersAndRoles(
        getService,
        matrix.map(({ user }) => user),
        matrix.map(({ role }) => role)
      );
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const { featureId, owner: featureOwner, privilege, user } of matrix) {
      describe(`${featureId}: ${privilege}`, () => {
        const auth = { user, space: null };

        for (const owner of OWNERS) {
          const canRead = owner === featureOwner;
          const canWrite = canRead && privilege === 'all';

          it(`${canWrite ? 'can' : 'cannot'} create a ${owner} case`, async () => {
            await createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner }),
              canWrite ? 200 : 403,
              auth
            );
          });

          it(`${canRead ? 'can' : 'cannot'} get a ${owner} case`, async () => {
            const theCase = await createCase(supertest, getPostCaseRequest({ owner }));
            await getCase({
              supertest: supertestWithoutAuth,
              caseId: theCase.id,
              expectedHttpCode: canRead ? 200 : 403,
              auth,
            });
          });

          it(`${canWrite ? 'can' : 'cannot'} update a ${owner} case`, async () => {
            const theCase = await createCase(supertest, getPostCaseRequest({ owner }));
            await updateCase({
              supertest: supertestWithoutAuth,
              params: { cases: [{ id: theCase.id, version: theCase.version, title: 'new' }] },
              expectedHttpCode: canWrite ? 200 : 403,
              auth,
            });
          });

          it(`${canWrite ? 'can' : 'cannot'} comment on a ${owner} case`, async () => {
            const theCase = await createCase(supertest, getPostCaseRequest({ owner }));
            await createComment({
              supertest: supertestWithoutAuth,
              caseId: theCase.id,
              params: { type: AttachmentType.user, comment: 'note', owner },
              expectedHttpCode: canWrite ? 200 : 403,
              auth,
            });
          });

          it(`${canWrite ? 'can' : 'cannot'} delete a ${owner} case`, async () => {
            const theCase = await createCase(supertest, getPostCaseRequest({ owner }));
            await deleteCases({
              supertest: supertestWithoutAuth,
              caseIDs: [theCase.id],
              expectedHttpCode: canWrite ? 204 : 403,
              auth,
            });
          });
        }

        it(`finds only ${featureOwner} cases`, async () => {
          await Promise.all(
            OWNERS.map((owner) => createCase(supertest, getPostCaseRequest({ owner })))
          );
          const res = await findCases({ supertest: supertestWithoutAuth, auth });
          expect(res.cases.map(({ owner }) => owner)).to.eql([featureOwner]);
        });
      });
    }
  });
};
