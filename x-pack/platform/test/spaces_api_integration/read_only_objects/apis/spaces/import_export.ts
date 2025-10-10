/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { result } from 'lodash';
import { parse as parseCookie } from 'tough-cookie';

import expect from '@kbn/expect';
import { NON_READ_ONLY_TYPE, READ_ONLY_TYPE } from '@kbn/read-only-objects-test-plugin/server';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  const login = async (username: string, password: string | undefined) => {
    const response = await supertestWithoutAuth
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: { username, password },
      })
      .expect(200);
    const cookie = parseCookie(response.headers['set-cookie'][0])!;
    const profileUidResponse = await supertestWithoutAuth
      .get('/internal/security/me')
      .set('Cookie', cookie.cookieString())
      .expect(200);
    return {
      cookie,
      profileUid: profileUidResponse.body.profile_uid,
    };
  };

  const loginAsKibanaAdmin = () => login(adminTestUser.username, adminTestUser.password);
  const loginAsObjectOwner = (username: string, password: string) => login(username, password);
  const loginAsNotObjectOwner = (username: string, password: string) => login(username, password);

  const performImport = async (
    toImport: {}[],
    userCookie: string,
    overwrite: boolean = false,
    createNewCopies: boolean = true,
    expectStatus: number = 200
  ) => {
    const requestBody = toImport.map((obj) => JSON.stringify({ ...obj })).join('\n');
    const query = overwrite ? '?overwrite=true' : createNewCopies ? '?createNewCopies=true' : '';
    const response = await supertestWithoutAuth
      .post(`/api/saved_objects/_import${query}`)
      .set('kbn-xsrf', 'true')
      .set('cookie', userCookie)
      .attach('file', Buffer.from(requestBody, 'utf8'), 'export.ndjson')
      .expect(expectStatus);

    return response;
  };

  describe('read only saved objects', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('#import', () => {
      it('should reject import of objects with unexpected access control metadata (unsupported types)', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');

        const toImport = [
          {
            accessControl: { accessMode: 'default', owner: 'just_some_dude' }, // UNEXPECTED ACCESS CONTROL META
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            id: '11111111111111111111111111111111',
            managed: false,
            references: [],
            type: NON_READ_ONLY_TYPE,
            updated_at: '2025-07-16T10:03:03.253Z',
            updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            version: 'WzY5LDFd',
          },
          {
            excludedObjects: [],
            excludedObjectsCount: 0,
            exportedCount: 1,
            missingRefCount: 0,
            missingReferences: [],
          },
        ];

        const response = await performImport(toImport, objectOwnerCookie.cookieString());

        expect(response.body).not.to.have.property('successResults');
        const errors = response.body.errors;
        expect(Array.isArray(errors)).to.be(true);
        expect(errors.length).to.be(1);
        expect(errors[0]).to.have.property('error');
        expect(errors[0].error).to.have.property('type', 'unexpected_access_control_metadata');
      });

      describe('creating new objects', () => {
        it(`should apply the current user as owner, and 'default' access mode, only to supported object types`, async () => {
          const { cookie: objectOwnerCookie, profileUid: testProfileId } = await loginAsObjectOwner(
            'test_user',
            'changeme'
          );

          const toImport = [
            {
              // some data in the file that defines a specific user and mode
              accessControl: { accessMode: 'read_only', owner: 'some_user' },
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
              id: '11111111111111111111111111111111',
              managed: false,
              references: [],
              type: READ_ONLY_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
              version: 'WzY5LDFd',
            },
            {
              // some data in the file for an type that does not support access control
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
              id: '22222222222222222222222222222222',
              managed: false,
              references: [],
              type: NON_READ_ONLY_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
              version: 'WzY5LDFd',
            },
            {
              excludedObjects: [],
              excludedObjectsCount: 0,
              exportedCount: 1,
              missingRefCount: 0,
              missingReferences: [],
            },
          ];

          const response = await performImport(toImport, objectOwnerCookie.cookieString());

          const results = response.body.successResults;
          expect(Array.isArray(results)).to.be(true);
          expect(results.length).to.be(2);
          expect(results[0].type).to.be(READ_ONLY_TYPE);
          expect(results[1].type).to.be(NON_READ_ONLY_TYPE);

          let getResponse = await supertestWithoutAuth
            .get(`/read_only_objects/${results[0].destinationId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .expect(200);

          expect(getResponse.body).to.have.property('accessControl');
          expect(getResponse.body.accessControl).to.have.property('accessMode', 'default');
          expect(getResponse.body.accessControl).to.have.property('owner', testProfileId);

          getResponse = await supertestWithoutAuth
            .get(`/non_read_only_objects/${results[1].destinationId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .expect(200);
          expect(getResponse.body).not.to.have.property('accessControl');
        });

        // ToDo: `should create objects supporting access control without access control metadata if there is not profile ID`

        it('should apply defaults to objects with no access control metadata', async () => {
          const { cookie: objectOwnerCookie, profileUid: testProfileId } = await loginAsObjectOwner(
            'test_user',
            'changeme'
          );

          const toImport = [
            {
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
              id: '11111111111111111111111111111111',
              managed: false,
              references: [],
              type: READ_ONLY_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
              version: 'WzY5LDFd',
            },
            {
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
              id: '22222222222222222222222222222222',
              managed: false,
              references: [],
              type: NON_READ_ONLY_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
              version: 'WzY5LDFd',
            },
            {
              excludedObjects: [],
              excludedObjectsCount: 0,
              exportedCount: 2,
              missingRefCount: 0,
              missingReferences: [],
            },
          ];

          const response = await performImport(toImport, objectOwnerCookie.cookieString());

          const results = response.body.successResults;
          expect(Array.isArray(results)).to.be(true);
          expect(results.length).to.be(2);
          expect(results[0].type).to.be(READ_ONLY_TYPE);
          expect(results[1].type).to.be(NON_READ_ONLY_TYPE);

          let getResponse = await supertestWithoutAuth
            .get(`/read_only_objects/${results[0].destinationId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .expect(200);

          expect(getResponse.body).to.have.property('accessControl');
          expect(getResponse.body.accessControl).to.have.property('accessMode', 'default');
          expect(getResponse.body.accessControl).to.have.property('owner', testProfileId);

          getResponse = await supertestWithoutAuth
            .get(`/non_read_only_objects/${results[1].destinationId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .expect(200);
          expect(getResponse.body).not.to.have.property('accessControl');
        });
      });

      describe('ovewriting objects', () => {
        it('should disallow overwrite of owned objects if not owned by the current user', async () => {
          const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();

          let createResponse = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          expect(createResponse.body.type).to.eql('read_only_type');
          expect(createResponse.body).to.have.property('accessControl');
          expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
          expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);
          const adminObjId = createResponse.body.id;

          const { cookie: testUserCookie, profileUid: testProfileId } = await loginAsNotObjectOwner(
            'test_user',
            'changeme'
          );

          createResponse = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', testUserCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          expect(createResponse.body.type).to.eql('read_only_type');
          expect(createResponse.body).to.have.property('accessControl');
          expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
          expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);
          const testUserObjId = createResponse.body.id;

          const toImport = [
            {
              // this first object will import ok
              accessControl: { accessMode: 'read_only', owner: testProfileId },
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: testProfileId,
              id: testUserObjId,
              managed: false,
              references: [],
              type: READ_ONLY_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: testProfileId,
              version: 'WzY5LDFd',
            },
            {
              // this second object will be rejected because it is owned by another user
              accessControl: { accessMode: 'read_only', owner: adminProfileId },
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: adminProfileId,
              id: adminObjId,
              managed: false,
              references: [],
              type: READ_ONLY_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: adminProfileId,
              version: 'WzY5LDFd',
            },
            {
              excludedObjects: [],
              excludedObjectsCount: 0,
              exportedCount: 2,
              missingRefCount: 0,
              missingReferences: [],
            },
          ];

          const importResponse = await performImport(
            toImport,
            testUserCookie.cookieString(),
            true, // overwrite = true,
            false, // createNewCopies = false
            200
          );
          const results = importResponse.text.split('\n').map((str) => JSON.parse(str));
          expect(Array.isArray(results)).to.be(true);
          expect(results.length).to.be(1);
          const result = results[0];
          expect(result).to.have.property('successCount', 1);
          expect(result).to.have.property('success', false);
          expect(result).to.have.property('successResults');
          expect(result.successResults).to.eql([
            {
              type: 'read_only_type',
              id: testUserObjId,
              meta: {},
              managed: false,
              overwrite: true,
            },
          ]);
          expect(result).to.have.property('errors');
          expect(result.errors).to.eql([
            {
              id: adminObjId,
              type: 'read_only_type',
              meta: {},
              error: {
                message:
                  'Overwriting objects in read-only mode that are owned by another user requires the manage_access_control privilege.',
                statusCode: 403,
                error: 'Forbidden',
                type: 'unknown',
              },
              overwrite: true,
            },
          ]);
        });

        it('should throw if there th import only contains objects are not overwritable by the current user', async () => {
          const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();

          let createResponse = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          expect(createResponse.body.type).to.eql('read_only_type');
          expect(createResponse.body).to.have.property('accessControl');
          expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
          expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);
          const firstObjId = createResponse.body.id;

          createResponse = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          expect(createResponse.body.type).to.eql('read_only_type');
          expect(createResponse.body).to.have.property('accessControl');
          expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
          expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);
          const secondObjId = createResponse.body.id;

          const { cookie: testUserCookie } = await loginAsNotObjectOwner('test_user', 'changeme');

          const toImport = [
            {
              // this first object will be rejected because it is owned by another user
              accessControl: { accessMode: 'read_only', owner: adminProfileId },
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: adminProfileId,
              id: firstObjId,
              managed: false,
              references: [],
              type: READ_ONLY_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: adminProfileId,
              version: 'WzY5LDFd',
            },
            {
              // this second object will be rejected because it is owned by another user
              accessControl: { accessMode: 'read_only', owner: adminProfileId },
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: adminProfileId,
              id: secondObjId,
              managed: false,
              references: [],
              type: READ_ONLY_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: adminProfileId,
              version: 'WzY5LDFd',
              // there are no other imported object, so the import with throw rather than succeed with partial success
            },
            {
              excludedObjects: [],
              excludedObjectsCount: 0,
              exportedCount: 2,
              missingRefCount: 0,
              missingReferences: [],
            },
          ];

          const importResponse = await performImport(
            toImport,
            testUserCookie.cookieString(),
            true, // overwrite = true,
            false, // createNewCopies = false
            403 // entire import fails
          );
          const results = importResponse.text.split('\n').map((str) => JSON.parse(str));
          expect(Array.isArray(results)).to.be(true);
          expect(results.length).to.be(1);
          expect(results[0]).to.be.eql({
            statusCode: 403,
            error: 'Forbidden',
            message: `Unable to bulk_create read_only_type}, access control restrictions for read_only_type:${firstObjId},read_only_type:${secondObjId}`,
          });
        });

        it('should allow overwrite of owned objects, but maintain original access control metadata, if owned by the current user', async () => {
          const { cookie: testUserCookie, profileUid: testProfileId } = await loginAsObjectOwner(
            'test_user',
            'changeme'
          );

          const createResponse = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', testUserCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          expect(createResponse.body.type).to.eql('read_only_type');
          expect(createResponse.body.attributes).to.have.property('description', 'test');
          expect(createResponse.body).to.have.property('accessControl');
          expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
          expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);

          const toImport = [
            {
              accessControl: { accessMode: 'default', owner: 'some_user' },
              attributes: { description: 'overwritten' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: testProfileId,
              id: createResponse.body.id,
              managed: false,
              references: [],
              type: READ_ONLY_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: testProfileId,
              version: 'WzY5LDFd',
            },
            {
              excludedObjects: [],
              excludedObjectsCount: 0,
              exportedCount: 1,
              missingRefCount: 0,
              missingReferences: [],
            },
          ];

          const importResponse = await performImport(
            toImport,
            testUserCookie.cookieString(),
            true, // overwrite = true,
            false // createNewCopies = false
          );

          const results = importResponse.body.successResults;
          expect(Array.isArray(results)).to.be(true);
          expect(results.length).to.be(1);
          expect(results[0].type).to.be(READ_ONLY_TYPE);
          expect(results[0].overwrite).to.be(true);

          const getResponse = await supertestWithoutAuth
            .get(`/read_only_objects/${results[0].id}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', testUserCookie.cookieString())
            .expect(200);

          expect(getResponse.body.attributes).to.have.property('description', 'overwritten');
          expect(getResponse.body).to.have.property('accessControl');
          expect(getResponse.body.accessControl).to.have.property('accessMode', 'read_only');
          expect(getResponse.body.accessControl).to.have.property('owner', testProfileId);
        });

        it('should allow overwrite of owned objects, but maintain original access control metadata, if admin', async () => {
          const loginResponse = await loginAsObjectOwner('test_user', 'changeme');
          const { cookie: testUserCookie, profileUid: testProfileId } = loginResponse;

          const createResponse = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', testUserCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          expect(createResponse.body.type).to.eql('read_only_type');
          expect(createResponse.body.attributes).to.have.property('description', 'test');
          expect(createResponse.body).to.have.property('accessControl');
          expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
          expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);

          const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();

          expect(adminProfileId).to.not.eql(testProfileId);

          const toImport = [
            {
              accessControl: { accessMode: 'default', owner: 'some_user' },
              attributes: { description: 'overwritten' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: testProfileId,
              id: createResponse.body.id,
              managed: false,
              references: [],
              type: READ_ONLY_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: testProfileId,
              version: 'WzY5LDFd',
            },
            {
              excludedObjects: [],
              excludedObjectsCount: 0,
              exportedCount: 1,
              missingRefCount: 0,
              missingReferences: [],
            },
          ];

          const importResponse = await performImport(
            toImport,
            adminCookie.cookieString(),
            true, // overwrite = true,
            false // createNewCopies = false
          );

          const results = importResponse.body.successResults;
          expect(Array.isArray(results)).to.be(true);
          expect(results.length).to.be(1);
          expect(results[0].type).to.be(READ_ONLY_TYPE);
          expect(results[0].overwrite).to.be(true);
          expect(results[0].id).to.be(createResponse.body.id);

          const getResponse = await supertestWithoutAuth
            .get(`/read_only_objects/${results[0].id}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', testUserCookie.cookieString())
            .expect(200);

          expect(getResponse.body.attributes).to.have.property('description', 'overwritten');
          expect(getResponse.body).to.have.property('accessControl');
          expect(getResponse.body.accessControl).to.have.property('accessMode', 'read_only');
          expect(getResponse.body.accessControl).to.have.property('owner', testProfileId); // retain the original owner
        });
      });

      // describe(`apply access mode from file`, () => {
      //   // Phase 2: `should apply the owner and access mode from file when 'apply access mode from file' is true`
      //   it('should reject import of objects with access control metadata that is missing mode', async () => {
      //     const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');

      //     const toImport = [
      //       {
      //         accessControl: { owner: '' }, // MISSING ACCESS CONTROL META MODE
      //         attributes: { description: 'test' },
      //         coreMigrationVersion: '8.8.0',
      //         created_at: '2025-07-16T10:03:03.253Z',
      //         created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      //         id: '11111111111111111111111111111111d',
      //         managed: false,
      //         references: [],
      //         type: READ_ONLY_TYPE,
      //         updated_at: '2025-07-16T10:03:03.253Z',
      //         updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      //         version: 'WzY5LDFd',
      //       },
      //       {
      //         excludedObjects: [],
      //         excludedObjectsCount: 0,
      //         exportedCount: 1,
      //         missingRefCount: 0,
      //         missingReferences: [],
      //       },
      //     ];

      //     const response = await performImport(toImport, objectOwnerCookie.cookieString());

      //     expect(response.body).not.to.have.property('successResults');
      //     const errors = response.body.errors;
      //     expect(Array.isArray(errors)).to.be(true);
      //     expect(errors.length).to.be(1);
      //     expect(errors[0]).to.have.property('error');
      //     expect(errors[0].error).to.have.property('type', 'missing_access_control_metadata');
      //   });
      // });

      // it('should reject import of objects with access control metadata if there is no active profile ID', async () => {
      //   const toImport = [
      //     {
      //       accessControl: { accessMode: 'default', owner: '' },
      //       attributes: { description: 'test' },
      //       coreMigrationVersion: '8.8.0',
      //       created_at: '2025-07-16T10:03:03.253Z',
      //       created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      //       id: '11111111111111111111111111111111',
      //       managed: false,
      //       references: [],
      //       type: READ_ONLY_TYPE,
      //       updated_at: '2025-07-16T10:03:03.253Z',
      //       updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      //       version: 'WzY5LDFd',
      //     },
      //     {
      //       excludedObjects: [],
      //       excludedObjectsCount: 0,
      //       exportedCount: 1,
      //       missingRefCount: 0,
      //       missingReferences: [],
      //     },
      //   ];

      //   const overwrite = false;
      //   const createNewCopies = true;
      //   const requestBody = toImport.map((obj) => JSON.stringify({ ...obj })).join('\n');
      //   const query = overwrite
      //     ? '?overwrite=true'
      //     : createNewCopies
      //     ? '?createNewCopies=true'
      //     : '';
      //   const response = await supertest
      //     .post(`/api/saved_objects/_import${query}`)
      //     .set('kbn-xsrf', 'true')
      //     .attach('file', Buffer.from(requestBody, 'utf8'), 'export.ndjson')
      //     .expect(200);

      //   expect(response.body).not.to.have.property('successResults');
      //   const errors = response.body.errors;
      //   expect(Array.isArray(errors)).to.be(true);
      //   expect(errors.length).to.be(1);
      //   expect(errors[0]).to.have.property('error');
      //   expect(errors[0].error).to.have.property('type', 'requires_profile_id');
      // });
    });

    describe('#export', () => {
      it('should retain all access control metadata', async () => {
        const { cookie: testUserCookie, profileUid: testProfileId } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );

        let createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);
        expect(createResponse.body.type).to.eql(READ_ONLY_TYPE);
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);
        const readOnlyId = createResponse.body.id;

        createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: NON_READ_ONLY_TYPE })
          .expect(200);
        expect(createResponse.body.type).to.eql(NON_READ_ONLY_TYPE);
        expect(createResponse.body).not.to.have.property('accessControl');
        const nonReadOnlyId = createResponse.body.id;

        const response = await supertestWithoutAuth
          .post(`/api/saved_objects/_export`)
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({
            objects: [
              {
                type: READ_ONLY_TYPE,
                id: readOnlyId,
              },
              {
                type: NON_READ_ONLY_TYPE,
                id: nonReadOnlyId,
              },
            ],
          })
          .expect(200);

        const results = response.text.split('\n').map((str) => JSON.parse(str));
        expect(Array.isArray(results)).to.be(true);
        expect(results.length).to.be(3);

        expect(results[0]).to.have.property('id', readOnlyId);
        expect(results[0]).to.have.property('accessControl');
        expect(results[0].accessControl).to.have.property('accessMode', 'read_only');
        expect(results[0].accessControl).to.have.property('owner', testProfileId);

        expect(results[1]).to.have.property('id', nonReadOnlyId);
        expect(results[1]).not.to.have.property('accessControl');

        expect(results[2]).to.have.property('exportedCount', 2);
      });
    });

    describe('#resolve_import_errors', () => {
      // Do we need to explicitly test anything here?
      // Probably just the case where we want to apply a new destination ID in the event of a conflict with object owned by another user
    });
  });
}
