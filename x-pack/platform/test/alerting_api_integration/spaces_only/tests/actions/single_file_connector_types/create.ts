/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function createSingleFileConnectorTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('create single file connector', () => {
    it('should include single file connector in action type registry', async () => {
      const response = await supertest
        .get('/api/actions/connector_types')
        .set('kbn-xsrf', 'foo')
        .expect(200);

      const connectorTypes = response.body;
      const connectorTypeIds = connectorTypes.map((type: { id: string }) => type.id);
      expect(connectorTypeIds.includes('test.single_file_connector')).to.be(true);
    });

    it('should successfully create test single file connector with basic auth', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A single file connector - using basic auth',
          connector_type_id: 'test.single_file_connector',
          config: {
            apiUrl: 'https://example.com/api',
          },
          secrets: {
            authType: 'basic',
            username: 'test_user',
            password: 'test_password',
          },
        })
        .expect(200);
    });

    it('should successfully create test single file connector with api key header auth', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A single file connector - using api key header auth',
          connector_type_id: 'test.single_file_connector',
          config: {
            apiUrl: 'https://example.com/api',
          },
          secrets: {
            authType: 'api_key_header',
            Key: 'abcdefg12345',
          },
        })
        .expect(200);
    });

    it('should fail create test single file connector with bearer auth (not supported)', async () => {
      const response = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A single file connector - using api key header auth',
          connector_type_id: 'test.single_file_connector',
          config: {
            apiUrl: 'https://example.com/api',
          },
          secrets: {
            authType: 'bearer',
            token: 'abcdefg12345',
          },
        })
        .expect(400);

      expect(response.body.message).to.eql(
        `error validating connector type secrets: ✖ Invalid input\n  → at authType`
      );
    });

    it('should fail create test single file connector with invalid basic auth data', async () => {
      const response = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A single file connector - using api key header auth',
          connector_type_id: 'test.single_file_connector',
          config: {
            apiUrl: 'https://example.com/api',
          },
          secrets: {
            authType: 'basic',
            email: 'test_user_email',
            password: 'test_password',
          },
        })
        .expect(400);

      expect(response.body.message).to.eql(
        `error validating connector type secrets: ✖ Invalid input: expected string, received undefined\n` +
          `  → at username`
      );
    });
  });
}
