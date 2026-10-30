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
import { superUser } from '../../../common/lib/authentication/users';
import type { Role, User } from '../../../common/lib/authentication/types';

const OWNERS = ['cases', 'securitySolution', 'observability'] as const;
const SPACES = [
  { id: 'classic_space', solution: 'classic' },
  { id: 'security_space', solution: 'security' },
  { id: 'oblt_space', solution: 'oblt' },
  { id: 'es_space', solution: 'es' },
] as const;

const casesV4Role = (privilege: 'all' | 'read'): Role => ({
  name: `cases_v4_${privilege}`,
  privileges: {
    elasticsearch: { indices: [{ names: ['*'], privileges: ['all'] }] },
    kibana: [{ feature: { casesV4: [privilege] }, spaces: ['*'] }],
  },
});

const casesV4User = (privilege: 'all' | 'read'): User => ({
  username: `cases_v4_${privilege}_user`,
  password: 'changeme',
  roles: [`cases_v4_${privilege}`],
});

const roles = [casesV4Role('all'), casesV4Role('read')];
const users = [casesV4User('all'), casesV4User('read')];

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const spacesService = getService('spaces');

  const getAvailableOwners = async (user: User, space: string) => {
    const { body } = await supertestWithoutAuth
      .get(`/s/${space}/internal/cases/_available_owners`)
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'foo')
      .expect(200);
    return body.owners;
  };

  describe('casesV4 RBAC', () => {
    before(async () => {
      await Promise.all(
        SPACES.map(({ id, solution }) => spacesService.create({ id, name: id, solution }))
      );
      await createUsersAndRoles(getService, users, roles);
    });

    after(async () => {
      await deleteUsersAndRoles(getService, users, roles);
      await Promise.all(SPACES.map(({ id }) => spacesService.delete(id)));
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const { id: space, solution } of SPACES) {
      describe(`in a ${solution} space`, () => {
        const allAuth = { user: casesV4User('all'), space };
        const readAuth = { user: casesV4User('read'), space };

        for (const owner of OWNERS) {
          it(`casesV4 all can create, read, update, comment on, and delete a ${owner} case`, async () => {
            const theCase = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner }),
              200,
              allAuth
            );
            await getCase({ supertest: supertestWithoutAuth, caseId: theCase.id, auth: allAuth });
            const [updated] = await updateCase({
              supertest: supertestWithoutAuth,
              params: { cases: [{ id: theCase.id, version: theCase.version, title: 'new' }] },
              auth: allAuth,
            });
            await createComment({
              supertest: supertestWithoutAuth,
              caseId: updated.id,
              params: { type: AttachmentType.user, comment: 'note', owner },
              auth: allAuth,
            });
            await deleteCases({
              supertest: supertestWithoutAuth,
              caseIDs: [theCase.id],
              auth: allAuth,
            });
          });

          it(`casesV4 read can read but not change a ${owner} case`, async () => {
            const theCase = await createCase(
              supertest,
              getPostCaseRequest({ owner }),
              200,
              { user: superUser, space }
            );
            await getCase({ supertest: supertestWithoutAuth, caseId: theCase.id, auth: readAuth });
            await createCase(supertestWithoutAuth, getPostCaseRequest({ owner }), 403, readAuth);
            await updateCase({
              supertest: supertestWithoutAuth,
              params: { cases: [{ id: theCase.id, version: theCase.version, title: 'new' }] },
              expectedHttpCode: 403,
              auth: readAuth,
            });
          });
        }

        it('casesV4 all finds the cases of every owner', async () => {
          await Promise.all(
            OWNERS.map((owner) =>
              createCase(supertestWithoutAuth, getPostCaseRequest({ owner }), 200, allAuth)
            )
          );
          const res = await findCases({ supertest: supertestWithoutAuth, auth: allAuth });
          expect(res.cases.map(({ owner }) => owner).sort()).to.eql([...OWNERS].sort());
        });

        it('reports every registered owner as available', async () => {
          expect(await getAvailableOwners(casesV4User('read'), space)).to.eql([
            'cases',
            'observability',
            'securitySolution',
          ]);
        });
      });
    }

    it('denies casesV4 in a classic space that disabled it', async () => {
      await spacesService.create({
        id: 'no_cases_space',
        name: 'no_cases_space',
        disabledFeatures: ['casesV4'],
      });
      try {
        await createCase(supertestWithoutAuth, getPostCaseRequest({ owner: 'cases' }), 403, {
          user: casesV4User('all'),
          space: 'no_cases_space',
        });
      } finally {
        await spacesService.delete('no_cases_space');
      }
    });

    it('keeps casesV4 in a classic space that disabled only one solution legacy Cases feature', async () => {
      await spacesService.create({
        id: 'no_obs_cases_space',
        name: 'no_obs_cases_space',
        disabledFeatures: ['observabilityCasesV3'],
      });
      try {
        await createCase(supertestWithoutAuth, getPostCaseRequest({ owner: 'observability' }), 200, {
          user: casesV4User('all'),
          space: 'no_obs_cases_space',
        });
      } finally {
        await spacesService.delete('no_obs_cases_space');
      }
    });
  });
};
