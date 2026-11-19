/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  // a user with only the ML "All" feature privilege, without saved objects management
  const mlAllRole = 'ft_ml_saved_objects_http_api_access_ml_all';
  const mlAllUser = 'ft_ml_saved_objects_http_api_access_user';
  const mlAllPassword = 'ml-all-password';

  const moduleId = 'ml_saved_objects_http_api_access_test_module';
  const moduleNdjson = JSON.stringify({
    type: 'ml-module',
    id: moduleId,
    attributes: {
      id: moduleId,
      title: 'Test module',
      type: 'test',
      jobs: [],
      datafeeds: [],
    },
  });

  const moduleExists = async () => {
    const { status } = await supertest
      .get(`/api/saved_objects/ml-module/${moduleId}`)
      .set(getCommonRequestHeader('1'));
    return status === 200;
  };

  const deleteModule = async () => {
    await supertest
      .delete(`/api/saved_objects/ml-module/${moduleId}`)
      .set(getCommonRequestHeader('1'));
  };

  describe('saved objects HTTP API access', function () {
    before(async () => {
      await security.role.create(mlAllRole, {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], feature: { ml: ['all'] }, spaces: ['*'] }],
      });
      await security.user.create(mlAllUser, {
        password: mlAllPassword,
        roles: [mlAllRole, 'machine_learning_admin'],
        full_name: 'ML all only',
      });
    });

    after(async () => {
      await security.user.delete(mlAllUser);
      await security.role.delete(mlAllRole);
    });

    afterEach(async () => {
      await deleteModule();
    });

    for (const type of ['ml-job', 'ml-trained-model']) {
      it(`should not allow ${type} saved objects to be created via the saved objects API`, async () => {
        const { body, status } = await supertestWithoutAuth
          .post(`/api/saved_objects/${type}/forged-id`)
          .auth(mlAllUser, mlAllPassword)
          .set(getCommonRequestHeader('1'))
          .send({ attributes: { job_id: 'forged', model_id: 'forged', type: 'anomaly-detector' } });
        ml.api.assertResponseStatusCode(400, status, body);
      });

      it(`should not allow ${type} saved objects to be found via the saved objects API`, async () => {
        const { body, status } = await supertestWithoutAuth
          .get(`/api/saved_objects/_find?type=${type}`)
          .auth(mlAllUser, mlAllPassword)
          .set(getCommonRequestHeader('1'));
        ml.api.assertResponseStatusCode(400, status, body);
      });
    }

    it('should not allow an ML "All" user to create ml-module saved objects', async () => {
      const { body, status } = await supertestWithoutAuth
        .post(`/api/saved_objects/ml-module/${moduleId}`)
        .auth(mlAllUser, mlAllPassword)
        .set(getCommonRequestHeader('1'))
        .send({ attributes: { id: moduleId, title: 'Test module', jobs: [], datafeeds: [] } });
      ml.api.assertResponseStatusCode(403, status, body);

      expect(await moduleExists()).to.eql(false);
    });

    it('should not allow an ML "All" user to import ml-module saved objects', async () => {
      await supertestWithoutAuth
        .post(`/api/saved_objects/_import`)
        .auth(mlAllUser, mlAllPassword)
        .set(getCommonRequestHeader('1'))
        .attach('file', Buffer.from(moduleNdjson), 'export.ndjson');

      expect(await moduleExists()).to.eql(false);
    });

    it('should allow a superuser to import ml-module saved objects', async () => {
      const { body, status } = await supertest
        .post(`/api/saved_objects/_import`)
        .set(getCommonRequestHeader('1'))
        .attach('file', Buffer.from(moduleNdjson), 'export.ndjson');
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.success).to.eql(true);
      expect(await moduleExists()).to.eql(true);
    });
  });
};
