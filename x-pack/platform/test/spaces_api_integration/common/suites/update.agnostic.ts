/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type {
  DeploymentAgnosticFtrProviderContext,
  SupertestWithRoleScopeType,
} from '../../deployment_agnostic/ftr_provider_context';
import { getUrlPrefix } from '../lib/space_test_utils';
import type { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface UpdateTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface UpdateTests {
  alreadyExists: UpdateTest;
  defaultSpace: UpdateTest;
  newSpace: UpdateTest;
}

interface UpdateTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId: string;
  tests: UpdateTests;
}

export function updateTestSuiteFactory(context: DeploymentAgnosticFtrProviderContext) {
  const esArchiver = context.getService('esArchiver');
  const spacesSupertest = context.getService('spacesSupertest');

  const expectRbacForbidden = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unauthorized to update spaces',
    });
  };

  const expectNotFound = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Not Found',
      message: 'Not Found',
      statusCode: 404,
    });
  };

  const expectDefaultSpaceResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      name: 'the new default',
      id: 'default',
      description: 'a description',
      color: '#ffffff',
      disabledFeatures: [],
      _reserved: true,
    });
  };

  const expectAlreadyExistsResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      name: 'space 1',
      id: 'space_1',
      description: 'a description',
      color: '#5c5959',
      disabledFeatures: [],
    });
  };

  const makeUpdateTest =
    (describeFn: DescribeFn) =>
    (description: string, { user, spaceId, tests }: UpdateTestDefinition) => {
      describeFn(description, () => {
        let supertest: SupertestWithRoleScopeType;
        before(async () => {
          supertest = await spacesSupertest.getSupertestWithRoleScope(user!);
          await esArchiver.load(
            'x-pack/platform/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
          );
        });
        after(async () => {
          await supertest.destroy();
          await esArchiver.unload(
            'x-pack/platform/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
          );
        });

        describe('space_1', () => {
          it(`should return ${tests.alreadyExists.statusCode}`, async () => {
            return supertest
              .put(`${getUrlPrefix(spaceId)}/api/spaces/space/space_1`)
              .send({
                name: 'space 1',
                id: 'space_1',
                description: 'a description',
                color: '#5c5959',
                _reserved: true,
                disabledFeatures: [],
              })
              .expect(tests.alreadyExists.statusCode)
              .then(tests.alreadyExists.response);
          });
        });

        describe(`default space`, () => {
          it(`should return ${tests.defaultSpace.statusCode}`, async () => {
            return supertest
              .put(`${getUrlPrefix(spaceId)}/api/spaces/space/default`)
              .send({
                name: 'the new default',
                id: 'default',
                description: 'a description',
                color: '#ffffff',
                _reserved: false,
                disabledFeatures: [],
              })
              .expect(tests.defaultSpace.statusCode)
              .then(tests.defaultSpace.response);
          });
        });

        describe(`when space doesn't exist`, () => {
          it(`should return ${tests.newSpace.statusCode}`, async () => {
            return supertest
              .put(`${getUrlPrefix(spaceId)}/api/spaces/space/marketing`)
              .send({
                name: 'marketing',
                id: 'marketing',
                description: 'a description',
                color: '#5c5959',
                disabledFeatures: [],
              })
              .expect(tests.newSpace.statusCode)
              .then(tests.newSpace.response);
          });
        });
      });
    };

  const updateTest = makeUpdateTest(describe);
  // @ts-ignore
  updateTest.only = makeUpdateTest(describe.only);

  return {
    expectAlreadyExistsResult,
    expectDefaultSpaceResult,
    expectNotFound,
    expectRbacForbidden,
    updateTest,
  };
}
