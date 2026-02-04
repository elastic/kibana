/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSFCServer } from '@kbn/actions-simulators-plugin/server/plugin';
import expect from '@kbn/expect';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import getPort from 'get-port';
import type http from 'http';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover } from '../../../../common/lib';

export default function createSingleFileConnectorTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('execute single file connector actions', () => {
    let apiUrl: string = '';
    let webhookServer: http.Server;
    let defaultSingleFileConnectorId: string = '';
    const message = 'hello';
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

    it('should successfully execute action of single file connector', async () => {
      const response = await supertest
        .post(`/api/actions/connector/${defaultSingleFileConnectorId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            subAction: 'testHandlerParams',
            subActionParams: { message: 'hello' },
          },
        })
        .expect(200);

      expect(response.body.data.message).to.eql(message);
      expect(response.body.data.username).to.eql(username);
      expect(response.body.data.password).to.eql(password);
      expect(response.body.data.authType).to.eql(authType);
      expect(response.body.data.apiUrl).to.eql(apiUrl);
    });

    describe('validation', () => {
      it('should successfully validate correct params for action', async () => {
        await supertest
          .post(`/api/actions/connector/${defaultSingleFileConnectorId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              subAction: 'validateParams',
              subActionParams: {
                foobar: 'foobar',
              },
            },
          })
          .expect(200);
      });

      it('should successfully validate incorrect params for action', async () => {
        await supertest
          .post(`/api/actions/connector/${defaultSingleFileConnectorId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              subAction: 'validateParams',
              subActionParams: {
                wrong_params: 'foobar',
              },
            },
          })
          .then((resp: any) => {
            expect(resp.body).to.eql({
              connector_id: defaultSingleFileConnectorId,
              status: 'error',
              retry: false,
              message: `error validating action params: ✖ Invalid input: expected string, received undefined\n  → at subActionParams.foobar`,
              errorSource: TaskErrorSource.USER,
            });
          });
      });

      it('should successfully validate invalid action id', async () => {
        await supertest
          .post(`/api/actions/connector/${defaultSingleFileConnectorId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              subAction: 'some_random_action',
              subActionParams: '{}',
            },
          })
          .then((resp: any) => {
            expect(resp.body).to.eql({
              connector_id: defaultSingleFileConnectorId,
              status: 'error',
              retry: false,
              message: `error validating action params: ✖ Invalid input\n  → at subAction`,
              errorSource: TaskErrorSource.USER,
            });
          });
      });
    });

    describe('error handling', () => {
      it('should successfully validate correct params for action', async () => {
        await supertest
          .post(`/api/actions/connector/${defaultSingleFileConnectorId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              subAction: 'throwError',
              subActionParams: {
                foobar: 'foobar',
              },
            },
          })
          .then((resp: any) => {
            expect(resp.body).to.eql({
              connector_id: defaultSingleFileConnectorId,
              status: 'error',
              message: `some error message`,
              errorSource: TaskErrorSource.USER,
            });
          });
      });
    });

    describe('authentication', () => {
      it('should successfully authenticate action basic auth', async () => {
        const response = await supertest
          .post(`/api/actions/connector/${defaultSingleFileConnectorId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              subAction: 'validateAuthentication',
              subActionParams: {},
            },
          })
          .expect(200);

        expect(response.body.data).to.eql('validation OK');
      });

      it('should successfully authenticate action with api key header auth', async () => {
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
          .post(`/api/actions/connector/${singleFileConnector.id}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              subAction: 'validateHeaders',
              subActionParams: {},
            },
          })
          .expect(200);

        expect(response.body.data.key).to.eql(key);
        expect(response.body.data['x-test-header']).to.eql('i-am-a-test-header-value');
        expect(response.body.data['kbn-xsrf']).to.eql('foo');
      });
    });
  });
}
