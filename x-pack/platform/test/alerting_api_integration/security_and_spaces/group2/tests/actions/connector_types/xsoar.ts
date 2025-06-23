/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  XSOARSimulator,
  XSOARPlaybooksResponse,
} from '@kbn/actions-simulators-plugin/server/xsoar_simulation';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

const connectorTypeId = '.xsoar';
const name = 'XSOAR action';
const secrets = {
  apiKey: 'apiKey',
};

// eslint-disable-next-line import/no-default-export
export default function xsoarTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  const createConnector = async (url: string) => {
    const { body } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        connector_type_id: connectorTypeId,
        config: { url },
        secrets,
      })
      .expect(200);

    return body.id;
  };

  describe('XSOAR', () => {
    describe('action creation', () => {
      const simulator = new XSOARSimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      const config = { url: '' };

      before(async () => {
        config.url = await simulator.start();
      });

      after(() => {
        simulator.close();
      });

      it('should return 200 when creating the connector', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config,
            secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name,
          connector_type_id: connectorTypeId,
          is_missing_secrets: false,
          config,
        });
      });

      it('should return 400 Bad Request when creating the connector without the url', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config: {},
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [url]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector with a url that is not allowed', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config: {
              url: 'http://xsoar.mynonexistent.com',
            },
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error validating url: target url "http://xsoar.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [apiKey]: expected value of type [string] but got [undefined]',
            });
          });
      });
    });

    describe('executor', () => {
      describe('validation', () => {
        const simulator = new XSOARSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });
        let xsoarActionId: string;

        before(async () => {
          const url = await simulator.start();
          xsoarActionId = await createConnector(url);
        });

        after(() => {
          simulator.close();
        });

        it('should fail when the params is empty', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${xsoarActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            });
          expect(200);

          expect(Object.keys(body).sort()).to.eql([
            'connector_id',
            'errorSource',
            'message',
            'retry',
            'status',
          ]);
          expect(body.connector_id).to.eql(xsoarActionId);
          expect(body.status).to.eql('error');
        });

        it('should fail when the subAction is invalid', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${xsoarActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'invalidAction' },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: xsoarActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.FRAMEWORK,
            service_message: `Sub action "invalidAction" is not registered. Connector id: ${xsoarActionId}. Connector name: XSOAR. Connector type: ${connectorTypeId}`,
          });
        });

        it("should fail to run when the name parameter isn't included", async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${xsoarActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                subAction: 'run',
                subActionParams: {
                  severity: 1,
                  createInvestigation: false,
                  body: '',
                  isRuleSeverity: false,
                },
              },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: xsoarActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.USER,
            service_message:
              'Request validation failed (Error: [name]: expected value of type [string] but got [undefined])',
          });
        });
      });

      describe('execution', () => {
        describe('successful response simulator', () => {
          const simulator = new XSOARSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let url: string;
          let xsoarActionId: string;

          before(async () => {
            url = await simulator.start();
            xsoarActionId = await createConnector(url);
          });

          after(() => {
            simulator.close();
          });

          it('should get playbooks', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${xsoarActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'getPlaybooks', subActionParams: {} },
              })
              .expect(200);

            expect(simulator.requestUrl).to.eql(`${url}/playbook/search`);
            expect(body).to.eql({
              status: 'ok',
              connector_id: xsoarActionId,
              data: XSOARPlaybooksResponse,
            });
          });

          it('should create incident', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${xsoarActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'run',
                  subActionParams: {
                    name: 'My test incident',
                    severity: 2,
                    playbookId: '8db0105c-f674-4d83-8095-f95a9f61e77a',
                    createInvestigation: false,
                    body: null,
                    isRuleSeverity: false,
                  },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({
              name: 'My test incident',
              severity: 2,
              playbookId: '8db0105c-f674-4d83-8095-f95a9f61e77a',
              createInvestigation: false,
            });
            expect(simulator.requestUrl).to.eql(`${url}/incident`);
            expect(body).to.eql({
              status: 'ok',
              connector_id: xsoarActionId,
              data: {},
            });
          });
        });

        describe('error response simulator', () => {
          const simulator = new XSOARSimulator({
            returnError: true,
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });

          let xsoarActionId: string;

          before(async () => {
            const url = await simulator.start();
            xsoarActionId = await createConnector(url);
          });

          after(() => {
            simulator.close();
          });

          it('should return a failure when attempting to get playbooks', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${xsoarActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'getPlaybooks',
                  subActionParams: {},
                },
              })
              .expect(200);

            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: true,
              connector_id: xsoarActionId,
              errorSource: TaskErrorSource.FRAMEWORK,
              service_message: 'Status code: 400. Message: API Error: Bad Request',
            });
          });

          it('should return a failure when attempting to run', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${xsoarActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'run',
                  subActionParams: {
                    name: 'My test incident',
                    playbookId: '8db0105c-f674-4d83-8095-f95a9f61e77a',
                    severity: 1,
                    isRuleSeverity: false,
                    createInvestigation: false,
                  },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({
              name: 'My test incident',
              playbookId: '8db0105c-f674-4d83-8095-f95a9f61e77a',
              severity: 1,
              createInvestigation: false,
            });
            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: true,
              connector_id: xsoarActionId,
              errorSource: TaskErrorSource.FRAMEWORK,
              service_message: 'Status code: 400. Message: API Error: Bad Request',
            });
          });
        });
      });
    });
  });
}
