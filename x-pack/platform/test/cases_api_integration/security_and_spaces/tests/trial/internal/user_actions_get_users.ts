/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Cookie } from 'tough-cookie';
import type { UserProfile } from '@kbn/security-plugin/common';
import { securitySolutionOnlyAllSpacesRole } from '../../../../common/lib/authentication/roles';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  updateCase,
  getCaseUsers,
  loginUsers,
  bulkGetUserProfiles,
} from '../../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../common/lib/authentication';
import { secOnlySpacesAll, superUser } from '../../../../common/lib/authentication/users';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('user_actions_get_users', () => {
    describe('profiles', () => {
      let cookies: Cookie[];
      let secUserProfile: UserProfile;
      let superUserProfile: UserProfile;
      let superUserHeaders: { Cookie: string };
      let secOnlyHeaders: { Cookie: string };

      before(async () => {
        await createUsersAndRoles(
          getService,
          [secOnlySpacesAll],
          [securitySolutionOnlyAllSpacesRole]
        );
      });

      beforeEach(async () => {
        cookies = await loginUsers({
          supertest: supertestWithoutAuth,
          users: [superUser, secOnlySpacesAll],
        });

        superUserHeaders = {
          Cookie: cookies[0].cookieString(),
        };

        secOnlyHeaders = {
          Cookie: cookies[1].cookieString(),
        };

        /**
         * We cannot call suggestUserProfiles on basic license.
         * To get the profiles of the users we create a case and
         * then we extract the profile ids from created_by.profile_uid
         */
        const [superUserCase, secUserCase] = await Promise.all([
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, null, superUserHeaders),
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, null, secOnlyHeaders),
        ]);

        const userProfiles = await bulkGetUserProfiles({
          supertest,
          // @ts-expect-error: profile uids are defined for both users
          req: { uids: [superUserCase.created_by.profile_uid, secUserCase.created_by.profile_uid] },
        });

        superUserProfile = userProfiles[0];
        secUserProfile = userProfiles[1];
      });

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      after(async () => {
        await deleteUsersAndRoles(
          getService,
          [secOnlySpacesAll],
          [securitySolutionOnlyAllSpacesRole]
        );
      });

      it('returns users correctly when assigning users to a case', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          null,
          superUserHeaders
        );

        // assignee superUser and secUserProfile
        await setAssignees({
          supertest,
          caseId: postedCase.id,
          version: postedCase.version,
          assignees: [{ uid: superUserProfile.uid }, { uid: secUserProfile.uid }],
          headers: superUserHeaders,
        });

        const { participants, assignees, unassignedUsers, reporter } = await getCaseUsers({
          caseId: postedCase.id,
          supertest,
        });

        expect(participants).to.eql([
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
            },
            uid: superUserProfile.uid,
          },
        ]);

        expect(reporter).to.eql({
          user: {
            username: superUserProfile.user.username,
            full_name: superUserProfile.user.full_name,
            email: superUserProfile.user.email,
          },
          uid: superUserProfile.uid,
        });

        expect(assignees).to.eql([
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
            },
            uid: superUserProfile.uid,
          },
          {
            user: {
              username: secUserProfile.user.username,
              full_name: secUserProfile.user.full_name,
              email: secUserProfile.user.email,
            },
            uid: secUserProfile.uid,
          },
        ]);

        expect(unassignedUsers).to.eql([]);
      });

      it('returns users correctly when de-assigning users to a case', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          null,
          superUserHeaders
        );

        // assignee superUser and secUserProfile
        const updatedCase = await setAssignees({
          supertest,
          caseId: postedCase.id,
          version: postedCase.version,
          assignees: [{ uid: superUserProfile.uid }, { uid: secUserProfile.uid }],
          headers: superUserHeaders,
        });

        // de-assignee secUser
        await setAssignees({
          supertest,
          caseId: updatedCase[0].id,
          version: updatedCase[0].version,
          assignees: [{ uid: superUserProfile.uid }],
          headers: superUserHeaders,
        });

        const { participants, assignees, unassignedUsers, reporter } = await getCaseUsers({
          caseId: postedCase.id,
          supertest,
        });

        expect(participants).to.eql([
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
            },
            uid: superUserProfile.uid,
          },
        ]);

        expect(reporter).to.eql({
          user: {
            username: superUserProfile.user.username,
            full_name: superUserProfile.user.full_name,
            email: superUserProfile.user.email,
          },
          uid: superUserProfile.uid,
        });

        expect(assignees).to.eql([
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
            },
            uid: superUserProfile.uid,
          },
        ]);

        expect(unassignedUsers).to.eql([
          {
            user: {
              username: secUserProfile.user.username,
              full_name: secUserProfile.user.full_name,
              email: secUserProfile.user.email,
            },
            uid: secUserProfile.uid,
          },
        ]);
      });

      it('does not return duplicate users', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          null,
          superUserHeaders
        );

        // assignee superUser and secUserProfile
        const updatedCase = await setAssignees({
          supertest,
          caseId: postedCase.id,
          version: postedCase.version,
          assignees: [{ uid: superUserProfile.uid }, { uid: secUserProfile.uid }],
          headers: superUserHeaders,
        });

        // de-assignee secUser
        const updatedCase2 = await setAssignees({
          supertest,
          caseId: updatedCase[0].id,
          version: updatedCase[0].version,
          assignees: [{ uid: superUserProfile.uid }],
          headers: superUserHeaders,
        });

        // re-assign secUser
        await setAssignees({
          supertest,
          caseId: updatedCase2[0].id,
          version: updatedCase2[0].version,
          assignees: [{ uid: superUserProfile.uid }, { uid: secUserProfile.uid }],
          headers: superUserHeaders,
        });

        const { participants, assignees, unassignedUsers, reporter } = await getCaseUsers({
          caseId: postedCase.id,
          supertest,
        });

        expect(participants).to.eql([
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
            },
            uid: superUserProfile.uid,
          },
        ]);

        expect(reporter).to.eql({
          user: {
            username: superUserProfile.user.username,
            full_name: superUserProfile.user.full_name,
            email: superUserProfile.user.email,
          },
          uid: superUserProfile.uid,
        });

        expect(assignees).to.eql([
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
            },
            uid: superUserProfile.uid,
          },
          {
            user: {
              username: secUserProfile.user.username,
              full_name: secUserProfile.user.full_name,
              email: secUserProfile.user.email,
            },
            uid: secUserProfile.uid,
          },
        ]);

        expect(unassignedUsers).to.eql([]);
      });
    });
  });
};

type UserActionParams<T> = Omit<Parameters<typeof updateCase>[0], 'params'> & {
  caseId: string;
  version: string;
} & T;

const setAssignees = async ({
  supertest,
  caseId,
  version,
  assignees,
  expectedHttpCode,
  auth,
  headers,
}: UserActionParams<{ assignees: Array<{ uid: string }> }>) =>
  updateCase({
    supertest,
    params: {
      cases: [
        {
          id: caseId,
          version,
          assignees,
        },
      ],
    },
    expectedHttpCode,
    auth,
    headers,
  });
