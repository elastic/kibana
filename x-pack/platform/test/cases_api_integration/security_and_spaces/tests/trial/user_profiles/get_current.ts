/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { CreateCaseUserAction, User } from '@kbn/cases-plugin/common/types/domain';
import { CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import type {
  SecurityCreateApiKeyResponse,
  SecurityRoleDescriptor,
} from '@elastic/elasticsearch/lib/api/types';
import { setupSuperUserProfile } from '../../../../common/lib/api/user_profiles';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createCase,
  createComment,
  createConfiguration,
  deleteAllCaseItems,
  getComment,
  updateCase,
  updateComment,
  getConfigurationRequest,
  updateConfiguration,
} from '../../../../common/lib/api';
import { findCaseUserActions } from '../../../../common/lib/api/user_actions';
import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('user_profiles', () => {
    describe('get_current', () => {
      let headers: Record<string, string>;
      let superUserWithProfile: User;
      let apiKey: SecurityCreateApiKeyResponse;
      let noProfileHeaders: Record<string, string>;

      // For "profile is not available" tests, we need an API key without security or API key
      // privileges to ensure that requests will not be able to retrieve profile info
      const roleDescriptors: Record<string, SecurityRoleDescriptor> = {
        some_role: {
          indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
          applications: [
            {
              application: 'kibana-.kibana',
              privileges: [
                'feature_securitySolutionCasesV2.all',
                'feature_securitySolutionFixture.all',
              ],
              resources: ['*'],
            },
          ],
        },
      };

      before(async () => {
        ({ headers, superUserWithProfile } = await setupSuperUserProfile(getService));
        apiKey = await es.security.createApiKey({
          name: `No profile key`,
          role_descriptors: roleDescriptors,
        });
        noProfileHeaders = {
          Authorization: `apikey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString(
            'base64'
          )}`,
        };
      });

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      describe('user actions', () => {
        describe('createdBy', () => {
          it('sets the profile uid for a case', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            const { userActions } = await findCaseUserActions({
              supertest: supertestWithoutAuth,
              caseID: caseInfo.id,
            });

            const createCaseUserAction = userActions[0] as unknown as CreateCaseUserAction;
            expect(createCaseUserAction.created_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            // Use the API key that cannot get profile info to create the case
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              noProfileHeaders
            );

            const { userActions } = await findCaseUserActions({
              supertest: supertestWithoutAuth,
              caseID: caseInfo.id,
            });

            const createCaseUserAction = userActions[0] as unknown as CreateCaseUserAction;
            expect(createCaseUserAction.created_by).to.eql({
              email: null,
              full_name: null,
              username: 'system_indices_superuser',
            });
          });
        });
      });

      describe('configure', () => {
        describe('createdBy', () => {
          it('sets the profile uid', async () => {
            const configuration = await createConfiguration(
              supertestWithoutAuth,
              getConfigurationRequest({ id: 'connector-2' }),
              200,
              null,
              headers
            );

            expect(configuration.created_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            // Use the API key that cannot get profile info to create the config
            const configuration = await createConfiguration(
              supertestWithoutAuth,
              getConfigurationRequest({ id: 'connector-2' }),
              200,
              null,
              noProfileHeaders
            );

            expect(configuration.created_by).to.eql({
              email: null,
              full_name: null,
              username: 'system_indices_superuser',
            });
          });
        });

        describe('updatedBy', () => {
          it('sets the profile uid', async () => {
            const configuration = await createConfiguration(
              supertestWithoutAuth,
              getConfigurationRequest({ id: 'connector-2' }),
              200,
              null,
              headers
            );

            const newConfiguration = await updateConfiguration(
              supertestWithoutAuth,
              configuration.id,
              {
                closure_type: 'close-by-pushing',
                version: configuration.version,
              },
              200,
              null,
              headers
            );

            expect(newConfiguration.updated_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            // Use the API key that cannot get profile info
            const configuration = await createConfiguration(
              supertestWithoutAuth,
              getConfigurationRequest({ id: 'connector-2' }),
              200,
              null,
              noProfileHeaders
            );

            const newConfiguration = await updateConfiguration(
              supertestWithoutAuth,
              configuration.id,
              {
                closure_type: 'close-by-pushing',
                version: configuration.version,
              },
              200,
              null,
              noProfileHeaders
            );

            expect(newConfiguration.updated_by).to.eql({
              email: null,
              full_name: null,
              username: 'system_indices_superuser',
            });
          });
        });
      });

      describe('comment', () => {
        describe('createdBy', () => {
          it('sets the profile uid', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            const patchedCase = await createComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              params: postCommentUserReq,
              auth: null,
              headers,
            });

            expect(patchedCase.comments![0].created_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            // Use the API key that cannot get profile info
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              noProfileHeaders
            );

            const patchedCase = await createComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              params: postCommentUserReq,
              auth: null,
              headers: noProfileHeaders,
            });

            expect(patchedCase.comments![0].created_by).to.eql({
              email: null,
              full_name: null,
              username: 'system_indices_superuser',
            });
          });
        });

        describe('updatedBy', () => {
          it('sets the profile uid', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            const patchedCase = await createComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              params: postCommentUserReq,
              auth: null,
              headers,
            });

            const updatedCase = await updateComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              req: {
                id: patchedCase.comments![0].id,
                version: patchedCase.comments![0].version,
                comment: 'a new comment',
                type: AttachmentType.user,
                owner: 'securitySolutionFixture',
              },
              auth: null,
              headers,
            });

            const patchedComment = await getComment({
              supertest: supertestWithoutAuth,
              caseId: updatedCase.id,
              commentId: patchedCase.comments![0].id,
            });

            expect(patchedComment.updated_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            // Use the API key that cannot get profile info
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              noProfileHeaders
            );

            const patchedCase = await createComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              params: postCommentUserReq,
              auth: null,
              headers: noProfileHeaders,
            });

            const updatedCase = await updateComment({
              supertest: supertestWithoutAuth,
              caseId: caseInfo.id,
              req: {
                id: patchedCase.comments![0].id,
                version: patchedCase.comments![0].version,
                comment: 'a new comment',
                type: AttachmentType.user,
                owner: 'securitySolutionFixture',
              },
              auth: null,
              headers: noProfileHeaders,
            });

            const patchedComment = await getComment({
              supertest: supertestWithoutAuth,
              caseId: updatedCase.id,
              commentId: patchedCase.comments![0].id,
            });

            expect(patchedComment.updated_by).to.eql({
              email: null,
              full_name: null,
              username: 'system_indices_superuser',
            });
          });
        });
      });

      describe('case', () => {
        describe('closedBy', () => {
          it('sets the profile uid', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            const patchedCases = await updateCase({
              supertest: supertestWithoutAuth,
              params: {
                cases: [
                  {
                    id: caseInfo.id,
                    version: caseInfo.version,
                    status: CaseStatuses.closed,
                  },
                ],
              },
              headers,
              auth: null,
            });

            expect(patchedCases[0].closed_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            // Use the API key that cannot get profile info
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              noProfileHeaders
            );

            const patchedCases = await updateCase({
              supertest: supertestWithoutAuth,
              params: {
                cases: [
                  {
                    id: caseInfo.id,
                    version: caseInfo.version,
                    status: CaseStatuses.closed,
                  },
                ],
              },
              auth: null,
              headers: noProfileHeaders,
            });

            expect(patchedCases[0].closed_by).to.eql({
              email: null,
              full_name: null,
              username: 'system_indices_superuser',
            });
          });
        });

        describe('updatedBy', () => {
          it('sets the profile uid', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            const patchedCases = await updateCase({
              supertest: supertestWithoutAuth,
              params: {
                cases: [
                  {
                    id: caseInfo.id,
                    version: caseInfo.version,
                    title: 'hello',
                  },
                ],
              },
              headers,
              auth: null,
            });

            expect(patchedCases[0].updated_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            // Use the API key that cannot get profile info
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              noProfileHeaders
            );

            const patchedCases = await updateCase({
              supertest: supertestWithoutAuth,
              params: {
                cases: [
                  {
                    id: caseInfo.id,
                    version: caseInfo.version,
                    title: 'hello',
                  },
                ],
              },
              headers: noProfileHeaders,
              auth: null,
            });

            expect(patchedCases[0].updated_by).to.eql({
              email: null,
              full_name: null,
              username: 'system_indices_superuser',
            });
          });
        });

        describe('createdBy', () => {
          it('sets the profile uid for a case', async () => {
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              headers
            );

            expect(caseInfo.created_by).to.eql(superUserWithProfile);
          });

          it('falls back to authc to get the user information when the profile is not available', async () => {
            // Use the API key that cannot get profile info
            const caseInfo = await createCase(
              supertestWithoutAuth,
              getPostCaseRequest(),
              200,
              null,
              noProfileHeaders
            );

            expect(caseInfo.created_by).to.eql({
              email: null,
              full_name: null,
              username: 'system_indices_superuser',
            });
          });
        });
      });
    });
  });
}
