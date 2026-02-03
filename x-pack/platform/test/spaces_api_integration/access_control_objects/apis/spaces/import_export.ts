/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parse as parseCookie } from 'tough-cookie';

import {
  ACCESS_CONTROL_TYPE,
  NON_ACCESS_CONTROL_TYPE,
} from '@kbn/access-control-test-plugin/server';
import type { SavedObjectsImportRetry } from '@kbn/core/public';
import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
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

  const performResolveImportErrors = async (
    toImport: {}[],
    userCookie: string,
    retries: SavedObjectsImportRetry[] = [],
    createNewCopies: boolean = true,
    expectStatus: number = 200
  ) => {
    const requestBody = toImport.map((obj) => JSON.stringify({ ...obj })).join('\n');
    const query = createNewCopies ? '?createNewCopies=true' : '';
    const response = await supertestWithoutAuth
      .post(`/api/saved_objects/_resolve_import_errors${query}`)
      .set('kbn-xsrf', 'true')
      .set('cookie', userCookie)
      .field('retries', JSON.stringify(retries))
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
            type: NON_ACCESS_CONTROL_TYPE,
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
              accessControl: { accessMode: 'write_restricted', owner: 'some_user' },
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
              id: '11111111111111111111111111111111',
              managed: false,
              references: [],
              type: ACCESS_CONTROL_TYPE,
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
              type: NON_ACCESS_CONTROL_TYPE,
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
          expect(results[0].type).to.be(ACCESS_CONTROL_TYPE);
          expect(results[1].type).to.be(NON_ACCESS_CONTROL_TYPE);

          let getResponse = await supertestWithoutAuth
            .get(`/access_control_objects/${results[0].destinationId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .expect(200);

          expect(getResponse.body).to.have.property('accessControl');
          expect(getResponse.body.accessControl).to.have.property('accessMode', 'default');
          expect(getResponse.body.accessControl).to.have.property('owner', testProfileId);

          getResponse = await supertestWithoutAuth
            .get(`/non_access_control_objects/${results[1].destinationId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .expect(200);
          expect(getResponse.body).not.to.have.property('accessControl');
        });

        it(`should create objects supporting access control without access control metadata if there is not profile ID`, async () => {
          const toImport = [
            {
              // some data in the file that defines a specific user and mode
              accessControl: { accessMode: 'write_restricted', owner: 'some_user' },
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
              id: '11111111111111111111111111111111',
              managed: false,
              references: [],
              type: ACCESS_CONTROL_TYPE,
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
              type: NON_ACCESS_CONTROL_TYPE,
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

          const requestBody = toImport.map((obj) => JSON.stringify({ ...obj })).join('\n');
          const response = await supertestWithoutAuth
            .post(`/api/saved_objects/_import?createNewCopies=true`)
            .set('kbn-xsrf', 'true')
            .set(
              'Authorization',
              `Basic ${Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`).toString(
                'base64'
              )}`
            )
            .attach('file', Buffer.from(requestBody, 'utf8'), 'export.ndjson')
            .expect(200);

          expect(response.body).to.have.property('success', true);
          expect(response.body).to.have.property('successCount', 2);
          expect(response.body).to.have.property('successResults');
          expect(Array.isArray(response.body.successResults)).to.be(true);
          const results = response.body.successResults;
          expect(results.length).to.be(2);
          expect(results[0]).to.have.property('type', ACCESS_CONTROL_TYPE);
          expect(results[0]).to.have.property('destinationId');
          expect(results[1]).to.have.property('type', NON_ACCESS_CONTROL_TYPE);
          expect(results[1]).to.have.property('destinationId');

          const importedId1 = results[0].destinationId;
          const importedId2 = results[1].destinationId;

          let getResponse = await supertestWithoutAuth
            .get(`/access_control_objects/${importedId1}`)
            .set('kbn-xsrf', 'true')
            .set(
              'Authorization',
              `Basic ${Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`).toString(
                'base64'
              )}`
            )
            .expect(200);
          expect(getResponse.body).not.to.have.property('accessControl');

          getResponse = await supertestWithoutAuth
            .get(`/non_access_control_objects/${importedId2}`)
            .set('kbn-xsrf', 'true')
            .set(
              'Authorization',
              `Basic ${Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`).toString(
                'base64'
              )}`
            )
            .expect(200);
          expect(getResponse.body).not.to.have.property('accessControl');
        });

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
              type: ACCESS_CONTROL_TYPE,
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
              type: NON_ACCESS_CONTROL_TYPE,
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
          expect(results[0].type).to.be(ACCESS_CONTROL_TYPE);
          expect(results[1].type).to.be(NON_ACCESS_CONTROL_TYPE);

          let getResponse = await supertestWithoutAuth
            .get(`/access_control_objects/${results[0].destinationId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .expect(200);

          expect(getResponse.body).to.have.property('accessControl');
          expect(getResponse.body.accessControl).to.have.property('accessMode', 'default');
          expect(getResponse.body.accessControl).to.have.property('owner', testProfileId);

          getResponse = await supertestWithoutAuth
            .get(`/non_access_control_objects/${results[1].destinationId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .expect(200);
          expect(getResponse.body).not.to.have.property('accessControl');
        });
      });

      describe('overwriting objects', () => {
        describe('negative tests', function () {
          this.tags('skipFIPS');

          it('should disallow overwrite of owned objects if not owned by the current user', async () => {
            const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();

            let createResponse = await supertestWithoutAuth
              .post('/access_control_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', adminCookie.cookieString())
              .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
              .expect(200);
            expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
            expect(createResponse.body).to.have.property('accessControl');
            expect(createResponse.body.accessControl).to.have.property(
              'accessMode',
              'write_restricted'
            );
            expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);
            const adminObjId = createResponse.body.id;

            const { cookie: testUserCookie, profileUid: testProfileId } =
              await loginAsNotObjectOwner('test_user', 'changeme');

            createResponse = await supertestWithoutAuth
              .post('/access_control_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', testUserCookie.cookieString())
              .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
              .expect(200);
            expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
            expect(createResponse.body).to.have.property('accessControl');
            expect(createResponse.body.accessControl).to.have.property(
              'accessMode',
              'write_restricted'
            );
            expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);
            const testUserObjId = createResponse.body.id;

            const toImport = [
              {
                // this first object will import ok
                accessControl: { accessMode: 'write_restricted', owner: testProfileId },
                attributes: { description: 'test' },
                coreMigrationVersion: '8.8.0',
                created_at: '2025-07-16T10:03:03.253Z',
                created_by: testProfileId,
                id: testUserObjId,
                managed: false,
                references: [],
                type: ACCESS_CONTROL_TYPE,
                updated_at: '2025-07-16T10:03:03.253Z',
                updated_by: testProfileId,
                version: 'WzY5LDFd',
              },
              {
                // this second object will be rejected because it is owned by another user
                accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
                attributes: { description: 'test' },
                coreMigrationVersion: '8.8.0',
                created_at: '2025-07-16T10:03:03.253Z',
                created_by: adminProfileId,
                id: adminObjId,
                managed: false,
                references: [],
                type: ACCESS_CONTROL_TYPE,
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
            const results = importResponse.text.split('\n').map((str: string) => JSON.parse(str));
            expect(Array.isArray(results)).to.be(true);
            expect(results.length).to.be(1);
            const result = results[0];
            expect(result).to.have.property('successCount', 1);
            expect(result).to.have.property('success', false);
            expect(result).to.have.property('successResults');
            expect(result.successResults).to.eql([
              {
                type: ACCESS_CONTROL_TYPE,
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
                type: ACCESS_CONTROL_TYPE,
                meta: {},
                error: {
                  message:
                    'Overwriting objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
                  statusCode: 403,
                  error: 'Forbidden',
                  type: 'unknown',
                },
                overwrite: true,
              },
            ]);
          });

          it('should throw if the import only contains objects are not overwritable by the current user', async () => {
            const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();

            let createResponse = await supertestWithoutAuth
              .post('/access_control_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', adminCookie.cookieString())
              .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
              .expect(200);
            expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
            expect(createResponse.body).to.have.property('accessControl');
            expect(createResponse.body.accessControl).to.have.property(
              'accessMode',
              'write_restricted'
            );
            expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);
            const firstObjId = createResponse.body.id;

            createResponse = await supertestWithoutAuth
              .post('/access_control_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', adminCookie.cookieString())
              .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
              .expect(200);
            expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
            expect(createResponse.body).to.have.property('accessControl');
            expect(createResponse.body.accessControl).to.have.property(
              'accessMode',
              'write_restricted'
            );
            expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);
            const secondObjId = createResponse.body.id;

            const { cookie: testUserCookie } = await loginAsNotObjectOwner('test_user', 'changeme');

            const toImport = [
              {
                // this first object will be rejected because it is owned by another user
                accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
                attributes: { description: 'test' },
                coreMigrationVersion: '8.8.0',
                created_at: '2025-07-16T10:03:03.253Z',
                created_by: adminProfileId,
                id: firstObjId,
                managed: false,
                references: [],
                type: ACCESS_CONTROL_TYPE,
                updated_at: '2025-07-16T10:03:03.253Z',
                updated_by: adminProfileId,
                version: 'WzY5LDFd',
              },
              {
                // this second object will be rejected because it is owned by another user
                accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
                attributes: { description: 'test' },
                coreMigrationVersion: '8.8.0',
                created_at: '2025-07-16T10:03:03.253Z',
                created_by: adminProfileId,
                id: secondObjId,
                managed: false,
                references: [],
                type: ACCESS_CONTROL_TYPE,
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
            const results = importResponse.text.split('\n').map((str: string) => JSON.parse(str));
            expect(Array.isArray(results)).to.be(true);
            expect(results.length).to.be(1);
            expect(results[0]).to.have.property('statusCode', 403);
            expect(results[0]).to.have.property('error', 'Forbidden');
            expect(results[0]).to.have.property('message');
            expect(results[0].message).to.contain(
              `Unable to bulk_create ${ACCESS_CONTROL_TYPE}. Access control restrictions for objects:`
            );
            expect(results[0].message).to.contain(`${ACCESS_CONTROL_TYPE}:${firstObjId}`); // the order may vary
            expect(results[0].message).to.contain(`${ACCESS_CONTROL_TYPE}:${secondObjId}`);
            expect(results[0].message).to.contain(
              `The "manage_access_control" privilege is required to affect write restricted objects owned by another user.`
            );
          });
        });
        it('should allow overwrite of owned objects, but maintain original access control metadata, if owned by the current user', async () => {
          const { cookie: testUserCookie, profileUid: testProfileId } = await loginAsObjectOwner(
            'test_user',
            'changeme'
          );

          const createResponse = await supertestWithoutAuth
            .post('/access_control_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', testUserCookie.cookieString())
            .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
            .expect(200);
          expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
          expect(createResponse.body.attributes).to.have.property('description', 'test');
          expect(createResponse.body).to.have.property('accessControl');
          expect(createResponse.body.accessControl).to.have.property(
            'accessMode',
            'write_restricted'
          );
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
              type: ACCESS_CONTROL_TYPE,
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
          expect(results[0].type).to.be(ACCESS_CONTROL_TYPE);
          expect(results[0].overwrite).to.be(true);

          const getResponse = await supertestWithoutAuth
            .get(`/access_control_objects/${results[0].id}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', testUserCookie.cookieString())
            .expect(200);

          expect(getResponse.body.attributes).to.have.property('description', 'overwritten');
          expect(getResponse.body).to.have.property('accessControl');
          expect(getResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
          expect(getResponse.body.accessControl).to.have.property('owner', testProfileId);
        });

        it('should allow overwrite of owned objects, but maintain original access control metadata, if admin', async () => {
          const loginResponse = await loginAsObjectOwner('test_user', 'changeme');
          const { cookie: testUserCookie, profileUid: testProfileId } = loginResponse;

          const createResponse = await supertestWithoutAuth
            .post('/access_control_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', testUserCookie.cookieString())
            .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
            .expect(200);
          expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
          expect(createResponse.body.attributes).to.have.property('description', 'test');
          expect(createResponse.body).to.have.property('accessControl');
          expect(createResponse.body.accessControl).to.have.property(
            'accessMode',
            'write_restricted'
          );
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
              type: ACCESS_CONTROL_TYPE,
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
          expect(results[0].type).to.be(ACCESS_CONTROL_TYPE);
          expect(results[0].overwrite).to.be(true);
          expect(results[0].id).to.be(createResponse.body.id);

          const getResponse = await supertestWithoutAuth
            .get(`/access_control_objects/${results[0].id}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', testUserCookie.cookieString())
            .expect(200);

          expect(getResponse.body.attributes).to.have.property('description', 'overwritten');
          expect(getResponse.body).to.have.property('accessControl');
          expect(getResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
          expect(getResponse.body.accessControl).to.have.property('owner', testProfileId); // retain the original owner
        });
      });

      // Note: This will be implemented in a follow-up phase
      // `should apply the owner and access mode from file when 'apply access mode from file' is true`
      // describe(`apply access mode from file`, () => {
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
      //         type: ACCESS_CONTROL_TYPE,
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
      //       type: ACCESS_CONTROL_TYPE,
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
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);
        const readOnlyId = createResponse.body.id;

        createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: NON_ACCESS_CONTROL_TYPE })
          .expect(200);
        expect(createResponse.body.type).to.eql(NON_ACCESS_CONTROL_TYPE);
        expect(createResponse.body).not.to.have.property('accessControl');
        const nonReadOnlyId = createResponse.body.id;

        const response = await supertestWithoutAuth
          .post(`/api/saved_objects/_export`)
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({
            objects: [
              {
                type: ACCESS_CONTROL_TYPE,
                id: readOnlyId,
              },
              {
                type: NON_ACCESS_CONTROL_TYPE,
                id: nonReadOnlyId,
              },
            ],
          })
          .expect(200);

        const results = response.text.split('\n').map((str: string) => JSON.parse(str));
        expect(Array.isArray(results)).to.be(true);
        expect(results.length).to.be(3);

        expect(results[0]).to.have.property('id', readOnlyId);
        expect(results[0]).to.have.property('accessControl');
        expect(results[0].accessControl).to.have.property('accessMode', 'write_restricted');
        expect(results[0].accessControl).to.have.property('owner', testProfileId);

        expect(results[1]).to.have.property('id', nonReadOnlyId);
        expect(results[1]).not.to.have.property('accessControl');

        expect(results[2]).to.have.property('exportedCount', 2);
      });
    });

    describe('#resolve_import_errors', () => {
      it(`should allow 'createNewCopies' global option`, async () => {
        const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();

        let createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);
        const adminObjId = createResponse.body.id;

        const { cookie: testUserCookie, profileUid: testProfileId } = await loginAsNotObjectOwner(
          'test_user',
          'changeme'
        );

        createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);
        const testUserObjId = createResponse.body.id;

        const toImport = [
          {
            // this first object will import ok
            accessControl: { accessMode: 'write_restricted', owner: testProfileId },
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: testProfileId,
            id: testUserObjId,
            managed: false,
            references: [],
            type: ACCESS_CONTROL_TYPE,
            updated_at: '2025-07-16T10:03:03.253Z',
            updated_by: testProfileId,
            version: 'WzY5LDFd',
          },
          {
            // this second object will be rejected because it is owned by another user
            accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: adminProfileId,
            id: adminObjId,
            managed: false,
            references: [],
            type: ACCESS_CONTROL_TYPE,
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

        const importResponse = await performResolveImportErrors(
          toImport,
          testUserCookie.cookieString(),
          [
            {
              type: ACCESS_CONTROL_TYPE,
              id: testUserObjId,
              overwrite: true, // retry will never occur
              replaceReferences: [],
            },
            {
              type: ACCESS_CONTROL_TYPE,
              id: adminObjId,
              overwrite: true, // retry will never occur
              replaceReferences: [],
            },
          ],
          true, // createNewCopies = true
          200
        );

        const results = importResponse.text.split('\n').map((str: string) => JSON.parse(str));
        expect(Array.isArray(results)).to.be(true);
        expect(results.length).to.be(1);
        const result = results[0];
        expect(result).to.have.property('successCount', 2);
        expect(result).to.have.property('success', true);
        expect(result).to.have.property('successResults');
        expect(Array.isArray(result.successResults)).to.be(true);
        expect(result.successResults.length).to.be(2);

        expect(result.successResults[0]).to.have.property('type', ACCESS_CONTROL_TYPE);
        expect(result.successResults[0]).to.have.property('id', testUserObjId);
        expect(result.successResults[0]).to.have.property('managed', false);
        expect(result.successResults[0]).to.have.property('overwrite', true);
        expect(result.successResults[0]).to.have.property('destinationId'); // generated ID for new copy

        expect(result.successResults[1]).to.have.property('type', ACCESS_CONTROL_TYPE);
        expect(result.successResults[1]).to.have.property('id', adminObjId);
        expect(result.successResults[1]).to.have.property('managed', false);
        expect(result.successResults[1]).to.have.property('overwrite', true);
        expect(result.successResults[1]).to.have.property('destinationId'); // generated ID for new copy
      });

      describe('should disallow', function () {
        this.tags('skipFIPS');

        it('overwrite retry for write-restricted objects not owned by the current user', async () => {
          const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();

          let createResponse = await supertestWithoutAuth
            .post('/access_control_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
            .expect(200);
          expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
          expect(createResponse.body).to.have.property('accessControl');
          expect(createResponse.body.accessControl).to.have.property(
            'accessMode',
            'write_restricted'
          );
          expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);
          const adminObjId = createResponse.body.id;

          const { cookie: testUserCookie, profileUid: testProfileId } = await loginAsNotObjectOwner(
            'test_user',
            'changeme'
          );

          createResponse = await supertestWithoutAuth
            .post('/access_control_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', testUserCookie.cookieString())
            .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
            .expect(200);
          expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
          expect(createResponse.body).to.have.property('accessControl');
          expect(createResponse.body.accessControl).to.have.property(
            'accessMode',
            'write_restricted'
          );
          expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);
          const testUserObjId = createResponse.body.id;

          const toImport = [
            {
              // this first object will import ok
              accessControl: { accessMode: 'write_restricted', owner: testProfileId },
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: testProfileId,
              id: testUserObjId,
              managed: false,
              references: [],
              type: ACCESS_CONTROL_TYPE,
              updated_at: '2025-07-16T10:03:03.253Z',
              updated_by: testProfileId,
              version: 'WzY5LDFd',
            },
            {
              // this second object will be rejected because it is owned by another user
              accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
              attributes: { description: 'test' },
              coreMigrationVersion: '8.8.0',
              created_at: '2025-07-16T10:03:03.253Z',
              created_by: adminProfileId,
              id: adminObjId,
              managed: false,
              references: [],
              type: ACCESS_CONTROL_TYPE,
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

          const importResponse = await performResolveImportErrors(
            toImport,
            testUserCookie.cookieString(),
            [
              {
                type: ACCESS_CONTROL_TYPE,
                id: testUserObjId,
                overwrite: true,
                replaceReferences: [],
              },
              {
                type: ACCESS_CONTROL_TYPE,
                id: adminObjId,
                overwrite: true,
                replaceReferences: [],
              },
            ],
            false, // createNewCopies = false
            200
          );
          const results = importResponse.text.split('\n').map((str: string) => JSON.parse(str));
          expect(Array.isArray(results)).to.be(true);
          expect(results.length).to.be(1);
          const result = results[0];
          expect(result).to.have.property('successCount', 1);
          expect(result).to.have.property('success', false);
          expect(result).to.have.property('successResults');
          expect(result.successResults).to.eql([
            {
              type: ACCESS_CONTROL_TYPE,
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
              type: ACCESS_CONTROL_TYPE,
              meta: {},
              error: {
                message:
                  'Overwriting objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
                statusCode: 403,
                error: 'Forbidden',
                type: 'unknown',
              },
              overwrite: true,
            },
          ]);
        });
      });

      it('should disallow create new retry with same ID for write-restricted objects not owned by the current user', async () => {
        const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();

        let createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);
        const adminObjId = createResponse.body.id;

        const { cookie: testUserCookie, profileUid: testProfileId } = await loginAsNotObjectOwner(
          'test_user',
          'changeme'
        );

        createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);
        const testUserObjId = createResponse.body.id;

        const toImport = [
          {
            // this first object will import ok
            accessControl: { accessMode: 'write_restricted', owner: testProfileId },
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: testProfileId,
            id: testUserObjId,
            managed: false,
            references: [],
            type: ACCESS_CONTROL_TYPE,
            updated_at: '2025-07-16T10:03:03.253Z',
            updated_by: testProfileId,
            version: 'WzY5LDFd',
          },
          {
            // this second object will be rejected because it is owned by another user
            accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: adminProfileId,
            id: adminObjId,
            managed: false,
            references: [],
            type: ACCESS_CONTROL_TYPE,
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

        const importResponse = await performResolveImportErrors(
          toImport,
          testUserCookie.cookieString(),
          [
            {
              type: ACCESS_CONTROL_TYPE,
              id: testUserObjId,
              overwrite: true,
              replaceReferences: [],
            },
            {
              type: ACCESS_CONTROL_TYPE,
              id: adminObjId,
              overwrite: false,
              createNewCopy: true,
              replaceReferences: [],
            },
          ],
          false, // createNewCopies = false
          200
        );

        const results = importResponse.text.split('\n').map((str: string) => JSON.parse(str));
        expect(Array.isArray(results)).to.be(true);
        expect(results.length).to.be(1);
        const result = results[0];
        expect(result).to.have.property('successCount', 1);
        expect(result).to.have.property('success', false);
        expect(result).to.have.property('successResults');
        expect(result.successResults).to.eql([
          {
            type: ACCESS_CONTROL_TYPE,
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
            type: ACCESS_CONTROL_TYPE,
            meta: {},
            error: {
              type: 'conflict',
            },
          },
        ]);
      });

      it('should allow create new retry with destiantion ID for write-restricted objects not owned by the current user', async () => {
        const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();

        let createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);
        const adminObjId = createResponse.body.id;

        const { cookie: testUserCookie, profileUid: testProfileId } = await loginAsNotObjectOwner(
          'test_user',
          'changeme'
        );

        createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        expect(createResponse.body.type).to.eql(ACCESS_CONTROL_TYPE);
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);
        const testUserObjId = createResponse.body.id;

        const toImport = [
          {
            // this first object will import ok
            accessControl: { accessMode: 'write_restricted', owner: testProfileId },
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: testProfileId,
            id: testUserObjId,
            managed: false,
            references: [],
            type: ACCESS_CONTROL_TYPE,
            updated_at: '2025-07-16T10:03:03.253Z',
            updated_by: testProfileId,
            version: 'WzY5LDFd',
          },
          {
            // this second object will be rejected because it is owned by another user
            accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: adminProfileId,
            id: adminObjId,
            managed: false,
            references: [],
            type: ACCESS_CONTROL_TYPE,
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

        const destinationId = adminObjId + '_new';

        const importResponse = await performResolveImportErrors(
          toImport,
          testUserCookie.cookieString(),
          [
            {
              type: ACCESS_CONTROL_TYPE,
              id: testUserObjId,
              overwrite: true,
              replaceReferences: [],
            },
            {
              type: ACCESS_CONTROL_TYPE,
              id: adminObjId,
              overwrite: false,
              createNewCopy: true,
              replaceReferences: [],
              destinationId,
            },
          ],
          false, // createNewCopies = false
          200
        );

        const results = importResponse.text.split('\n').map((str: string) => JSON.parse(str));
        expect(Array.isArray(results)).to.be(true);
        expect(results.length).to.be(1);
        const result = results[0];
        expect(result).to.have.property('successCount', 2);
        expect(result).to.have.property('success', true);
        expect(result).to.have.property('successResults');
        expect(result.successResults).to.eql([
          {
            type: ACCESS_CONTROL_TYPE,
            id: testUserObjId,
            meta: {},
            managed: false,
            overwrite: true,
          },
          {
            type: ACCESS_CONTROL_TYPE,
            id: adminObjId,
            destinationId,
            meta: {},
            managed: false,
            createNewCopy: true,
          },
        ]);
      });
    });
  });
}
