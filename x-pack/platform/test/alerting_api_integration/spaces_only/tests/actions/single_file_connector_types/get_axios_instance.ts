/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type http from 'http';
import getPort from 'get-port';
import expect from '@kbn/expect';
import { getSFCServer } from '@kbn/actions-simulators-plugin/server/plugin';
import { ObjectRemover } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function createSingleFileConnectorTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('getAxiosInstances', () => {
    let apiUrl: string = '';
    let webhookServer: http.Server;
    let defaultSingleFileConnectorId: string = '';
    const username = 'elastic';
    const password = 'changeme';
    const authType = 'basic';

    before(async () => {
      webhookServer = await getSFCServer();
      const availablePort = await getPort({ port: 9000 });
      webhookServer.listen(availablePort);
      apiUrl = `http://localhost:${availablePort}`;
      const { body: singleFileConnector } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A single file connector - using basic auth',
          connector_type_id: 'test.single_file_connector',
          config: {
            apiUrl,
          },
          secrets: {
            authType,
            username,
            password,
          },
        })
        .expect(200);
      defaultSingleFileConnectorId = singleFileConnector.id;
      objectRemover.add('default', defaultSingleFileConnectorId, 'connector', 'actions', false);
    });

    after(async () => {
      webhookServer.close();
      await objectRemover.removeAll();
    });

    it('should create axios instance with basic auth', async () => {
      const response = await supertest
        .post(`/api/alerts_fixture/${defaultSingleFileConnectorId}/_test_get_axios`)
        .set('kbn-xsrf', 'foo')
        .send({
          method: 'post',
          url: apiUrl,
          data: 'validateAuthentication',
        })
        .expect(200);

      expect(response.text).to.eql('validation OK');
    });

    it('should create axios instance with api key header auth', async () => {
      const key = 'abcdefg12345';
      const { body: singleFileConnector } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A single file connector - using api key header auth',
          connector_type_id: 'test.single_file_connector',
          config: {
            apiUrl,
          },
          secrets: {
            authType: 'api_key_header',
            Key: key,
          },
        })
        .expect(200);

      objectRemover.add('default', singleFileConnector.id, 'connector', 'actions', false);

      const response = await supertest
        .post(`/api/alerts_fixture/${singleFileConnector.id}/_test_get_axios`)
        .set('kbn-xsrf', 'foo')
        .send({
          method: 'post',
          url: apiUrl,
          data: 'validateHeaders',
        })
        .expect(200);

      expect(response.body.key).to.eql(key);
    });

    it('should not create axios instance if connector is not workflows only', async () => {
      const { body: otherTypeConnector } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A server.log connector',
          connector_type_id: '.server-log',
        })
        .expect(200);

      objectRemover.add('default', otherTypeConnector.id, 'connector', 'actions', false);

      const response = await supertest
        .post(`/api/alerts_fixture/${otherTypeConnector.id}/_test_get_axios`)
        .set('kbn-xsrf', 'foo')
        .send({
          method: 'get',
          url: apiUrl,
          data: 'noop',
        })
        .expect(200);

      expect(response.text).to.eql(
        'Unable to get axios instance for .server-log. This function is exclusive for workflows-only connectors.'
      );
    });
  });
}
