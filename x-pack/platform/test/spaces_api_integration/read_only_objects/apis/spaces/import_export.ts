/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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

    return {
      cookie: parseCookie(response.headers['set-cookie'][0])!,
      profileUid: response.body.profile_uid,
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
      it('should only apply the current user as the owner of supported objects', async () => {
        const { cookie: objectOwnerCookie, profileUid: testProfileId } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );

        const toImport = [
          {
            accessControl: { accessMode: 'read_only', owner: '' },
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            id: '8dd4fb4f-aec8-448b-973b-72f02656688d',
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
            id: '8dd4fb4f-aec8-448b-973b-72f02656688d',
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
        expect(getResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(getResponse.body.accessControl).to.have.property('owner', testProfileId);

        getResponse = await supertestWithoutAuth
          .get(`/non_read_only_objects/${results[1].destinationId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(200);
        expect(getResponse.body).not.to.have.property('accessControl');
      });

      // ToDo: this is forcing supporting types to have access control metadata, is that what we want?
      it.skip('should import objects with no access control metadata', async () => {
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
            id: '8dd4fb4f-aec8-448b-973b-72f02656688d',
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
            id: '8dd4fb4f-aec8-448b-973b-72f02656688d',
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

        expect(getResponse.body).not.to.have.property('accessControl');

        getResponse = await supertestWithoutAuth
          .get(`/non_read_only_objects/${results[1].destinationId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(200);
        expect(getResponse.body).not.to.have.property('accessControl');
      });

      it('should reject import of objects with unexpected access control metadata (unsupported types)', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');

        const toImport = [
          {
            accessControl: { accessMode: 'default', owner: '' }, // UNEXPECTED ACCESS CONTROL META
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            id: '8dd4fb4f-aec8-448b-973b-72f02656688d',
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

      // Alternatively, we could force a default mode of "default", but technically, this would be a bad export file
      // We do not check for missing owner, because empty that field on export
      it('should reject import of objects with access control metadata that is missing mode', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');

        const toImport = [
          {
            accessControl: { owner: '' }, // MISSING ACCESS CONTROL META MODE
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            id: '8dd4fb4f-aec8-448b-973b-72f02656688d',
            managed: false,
            references: [],
            type: READ_ONLY_TYPE,
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
        expect(errors[0].error).to.have.property('type', 'missing_access_control_metadata');
      });

      it('should reject import of objects with access control metadata if there is no active profile ID', async () => {
        const toImport = [
          {
            accessControl: { accessMode: 'default', owner: '' },
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            id: '8dd4fb4f-aec8-448b-973b-72f02656688d',
            managed: false,
            references: [],
            type: READ_ONLY_TYPE,
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

        const overwrite = false;
        const createNewCopies = true;
        const requestBody = toImport.map((obj) => JSON.stringify({ ...obj })).join('\n');
        const query = overwrite
          ? '?overwrite=true'
          : createNewCopies
          ? '?createNewCopies=true'
          : '';
        const response = await supertest
          .post(`/api/saved_objects/_import${query}`)
          .set('kbn-xsrf', 'true')
          .attach('file', Buffer.from(requestBody, 'utf8'), 'export.ndjson')
          .expect(200);

        expect(response.body).not.to.have.property('successResults');
        const errors = response.body.errors;
        expect(Array.isArray(errors)).to.be(true);
        expect(errors.length).to.be(1);
        expect(errors[0]).to.have.property('error');
        expect(errors[0].error).to.have.property('type', 'requires_profile_id');
      });

      // ToDo: this needs to be updated once the create/bulk create operations are updated to address overwrite of owned objects
      it('should disallow overwrite of owned objects if not owned by the current user', async () => {
        const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        expect(createResponse.body.type).to.eql('read_only_type');
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileId);

        const { cookie: testUserCookie, profileUid: testProfileId } = await loginAsNotObjectOwner(
          'test_user',
          'changeme'
        );

        const toImport = [
          {
            accessControl: { accessMode: 'read_only', owner: '' },
            attributes: { description: 'test' },
            coreMigrationVersion: '8.8.0',
            created_at: '2025-07-16T10:03:03.253Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            id: createResponse.body.id,
            managed: false,
            references: [],
            type: READ_ONLY_TYPE,
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

        const importResponse = await performImport(
          toImport,
          testUserCookie.cookieString(),
          true, // overwrite = true,
          false // createNewCopies = false
        );

        // This should return an error, injected by the create operation (ToDo)
        const results = importResponse.body.successResults;
        expect(Array.isArray(results)).to.be(true);
        expect(results.length).to.be(1);
        expect(results[0].type).to.be(READ_ONLY_TYPE);
      });

      it('should allow overwrite of owned objects if owned by the current user', async () => {
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
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);

        const toImport = [
          {
            accessControl: { accessMode: 'read_only', owner: '' },
            attributes: { description: 'test' },
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

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${results[0].id}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .expect(200);

        expect(getResponse.body).to.have.property('accessControl');
        expect(getResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(getResponse.body.accessControl).to.have.property('owner', testProfileId);
      });

      it('should allow overwrite of owned objects if admin', async () => {
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
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);

        const { cookie: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin();

        const toImport = [
          {
            accessControl: { accessMode: 'read_only', owner: '' },
            attributes: { description: 'test' },
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

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${results[0].id}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .expect(200);

        expect(getResponse.body).to.have.property('accessControl');
        expect(getResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(getResponse.body.accessControl).to.have.property('owner', adminProfileId);
      });
    });

    describe('#export', () => {
      it('should remove owner profile ID string from access control metadata', async () => {
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
        expect(createResponse.body).to.have.property('accessControl');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', testProfileId);

        const response = await supertestWithoutAuth
          .post(`/api/saved_objects/_export`)
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({
            objects: [
              {
                type: READ_ONLY_TYPE,
                id: createResponse.body.id,
              },
            ],
          })
          .expect(200);

        const results = response.text.split('\n').map((str) => JSON.parse(str));
        expect(Array.isArray(results)).to.be(true);
        expect(results.length).to.be(2);
        expect(results[0]).to.have.property('id', createResponse.body.id);
        expect(results[0]).to.have.property('accessControl');
        expect(results[0].accessControl).to.have.property('accessMode', 'read_only');
        expect(results[0].accessControl).to.have.property('owner', '');
        expect(results[1]).to.have.property('exportedCount', 1);
      });
    });
  });
}
