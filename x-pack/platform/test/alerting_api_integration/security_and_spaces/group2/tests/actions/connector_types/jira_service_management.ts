/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';

import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import {
  JiraServiceManagementSimulator,
  jsmSuccessResponse,
} from '@kbn/actions-simulators-plugin/server/jira_service_management_simulator';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog } from '../../../../../common/lib';

export default function jiraServiceManagementTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');
  const retry = getService('retry');

  describe('Jira Service Management', () => {
    describe('action creation', () => {
      const simulator = new JiraServiceManagementSimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      let simulatorUrl: string;

      before(async () => {
        simulatorUrl = await simulator.start();
      });

      after(() => {
        simulator.close();
      });

      it('should return 200 when creating the connector', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A Jira Service Management action',
            connector_type_id: '.jira-service-management',
            config: {
              apiUrl: simulatorUrl,
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name: 'A Jira Service Management action',
          connector_type_id: '.jira-service-management',
          is_missing_secrets: false,
          config: {
            apiUrl: simulatorUrl,
          },
          is_connector_type_deprecated: false,
        });
      });

      it('should return 400 Bad Request when creating the connector without the apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A Jira Service Management action',
            connector_type_id: '.jira-service-management',
            config: {},
            secrets: {
              apiKey: '123',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: `error validating action type config: [\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"string\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"apiUrl\"\n    ],\n    \"message\": \"Required\"\n  }\n]`,
            });
          });
      });

      it('should return 400 Bad Request when creating the connector with a apiUrl that is not allowed', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A Jira Service Management action',
            connector_type_id: '.jira-service-management',
            config: {
              apiUrl: 'http://jsm.mynonexistent.com',
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error validating url: target url "http://jsm.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A Jira Service Management action',
            connector_type_id: '.jira-service-management',
            config: {
              apiUrl: simulatorUrl,
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: `error validating action type secrets: [\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"string\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"apiKey\"\n    ],\n    \"message\": \"Required\"\n  }\n]`,
            });
          });
      });
    });

    describe('executor', () => {
      describe('validation', () => {
        const simulator = new JiraServiceManagementSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });
        let simulatorUrl: string;
        let jsmManagementActionId: string;

        before(async () => {
          simulatorUrl = await simulator.start();
          jsmManagementActionId = await createConnector(simulatorUrl);
        });

        after(() => {
          simulator.close();
        });

        it('should fail when the params is empty', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
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
          expect(body.connector_id).to.eql(jsmManagementActionId);
          expect(body.status).to.eql('error');
        });

        it('should fail when the subAction is invalid', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'invalidAction' },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: jsmManagementActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.FRAMEWORK,
            service_message: `Sub action "invalidAction" is not registered. Connector id: ${jsmManagementActionId}. Connector name: Jira Service Management. Connector type: .jira-service-management`,
          });
        });

        it("should fail to create an alert when the message parameter isn't included", async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'createAlert', subActionParams: {} },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: jsmManagementActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.USER,
            service_message: `Request validation failed ([\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"string\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"message\"\n    ],\n    \"message\": \"Required\"\n  }\n])`,
          });
        });

        it("should fail to close an alert when the alias parameter isn't included", async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'closeAlert', subActionParams: {} },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: jsmManagementActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.USER,
            service_message: `Request validation failed ([\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"string\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"alias\"\n    ],\n    \"message\": \"Required\"\n  }\n])`,
          });
        });

        describe('optional parameters', () => {
          describe('responders', () => {
            it('should fail to create an alert when the responders is an invalid type', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      responders: [
                        {
                          name: 'sam',
                          type: 'invalidType',
                        },
                      ],
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: jsmManagementActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.USER,
                service_message: `Request validation failed ([\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"string\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"responders\",\n      0,\n      \"id\"\n    ],\n    \"message\": \"Required\"\n  },\n  {\n    \"received\": \"invalidType\",\n    \"code\": \"invalid_enum_value\",\n    \"options\": [\n      \"team\",\n      \"user\",\n      \"escalation\",\n      \"schedule\"\n    ],\n    \"path\": [\n      \"responders\",\n      0,\n      \"type\"\n    ],\n    \"message\": \"Invalid enum value. Expected 'team' | 'user' | 'escalation' | 'schedule', received 'invalidType'\"\n  },\n  {\n    \"code\": \"unrecognized_keys\",\n    \"keys\": [\n      \"name\"\n    ],\n    \"path\": [\n      \"responders\",\n      0\n    ],\n    \"message\": \"Unrecognized key(s) in object: 'name'\"\n  }\n])`,
              });
            });

            it('should fail to create an alert when the responders is missing the id', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      responders: [
                        {
                          type: 'schedule',
                        },
                      ],
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: jsmManagementActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.USER,
                service_message: `Request validation failed ([\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"string\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"responders\",\n      0,\n      \"id\"\n    ],\n    \"message\": \"Required\"\n  }\n])`,
              });
            });

            it('should succeed to create an alert when the responders has a valid team and id', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      responders: [
                        {
                          id: '123',
                          type: 'team',
                        },
                        {
                          id: '456',
                          type: 'team',
                        },
                      ],
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: jsmManagementActionId,
                status: 'ok',
                data: {
                  requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
                  result: 'Request will be processed',
                  took: 0.107,
                },
              });
            });
          });

          describe('details', () => {
            it('should fail to create an alert when the details field is a record of string to number', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      details: {
                        bananas: 1,
                      },
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: jsmManagementActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.USER,
                service_message: `Request validation failed ([\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"string\",\n    \"received\": \"number\",\n    \"path\": [\n      \"details\",\n      \"bananas\"\n    ],\n    \"message\": \"Expected string, received number\"\n  }\n])`,
              });
            });

            it('should succeed to create an alert when the details field a record of string to string', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      details: {
                        bananas: 'hello',
                      },
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: jsmManagementActionId,
                status: 'ok',
                data: {
                  requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
                  result: 'Request will be processed',
                  took: 0.107,
                },
              });
            });
          });
        });
      });

      describe('execution', () => {
        describe('successful response simulator', () => {
          const simulator = new JiraServiceManagementSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let simulatorUrl: string;
          let jsmManagementActionId: string;
          let createAlertUrl: string;

          before(async () => {
            simulatorUrl = await simulator.start();
            createAlertUrl = createUrlString(simulatorUrl, 'alerts');
            jsmManagementActionId = await createConnector(simulatorUrl);
          });

          after(() => {
            simulator.close();
          });

          it('should create an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'createAlert', subActionParams: { message: 'message' } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message' });
            expect(simulator.requestUrl).to.eql(createAlertUrl);
            expect(body).to.eql({
              status: 'ok',
              connector_id: jsmManagementActionId,
              data: jsmSuccessResponse,
            });

            const events: IValidatedEvent[] = await retry.try(async () => {
              return await getEventLog({
                getService,
                spaceId: 'default',
                type: 'action',
                id: jsmManagementActionId,
                provider: 'actions',
                actions: new Map([
                  ['execute-start', { equal: 1 }],
                  ['execute', { equal: 1 }],
                ]),
              });
            });

            const executeEvent = events[1];
            expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(21);
          });

          it('should preserve the alias when it is 512 characters when creating an alert', async () => {
            const alias = 'a'.repeat(512);

            const { body } = await supertest
              .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'createAlert',
                  subActionParams: { message: 'message', alias },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message', alias });
            expect(simulator.requestUrl).to.eql(createAlertUrl);
            expect(body).to.eql({
              status: 'ok',
              connector_id: jsmManagementActionId,
              data: jsmSuccessResponse,
            });
          });

          it('should sha256 hash the alias when it is over 512 characters when creating an alert', async () => {
            const alias = 'a'.repeat(513);

            // sha256 hash for 513 a characters
            const hashedAlias =
              'sha-02425c0f5b0dabf3d2b9115f3f7723a02ad8bcfb1534a0d231614fd42b8188f6';

            const { body } = await supertest
              .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'createAlert',
                  subActionParams: { message: 'message', alias },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message', alias: hashedAlias });
            expect(simulator.requestUrl).to.eql(createAlertUrl);
            expect(body).to.eql({
              status: 'ok',
              connector_id: jsmManagementActionId,
              data: jsmSuccessResponse,
            });
          });

          it('should sha256 hash the alias when it is over 512 characters when closing an alert', async () => {
            const alias = 'a'.repeat(513);

            // sha256 hash for 513 a characters
            const hashedAlias =
              'sha-02425c0f5b0dabf3d2b9115f3f7723a02ad8bcfb1534a0d231614fd42b8188f6';

            const { body } = await supertest
              .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'closeAlert',
                  subActionParams: { alias },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({});
            expect(simulator.requestUrl).to.eql(
              createCloseAlertUrl(simulatorUrl, `alerts/${hashedAlias}/close`)
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: jsmManagementActionId,
              data: jsmSuccessResponse,
            });
          });

          it('should close an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'closeAlert', subActionParams: { alias: '123' } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({});
            expect(simulator.requestUrl).to.eql(
              createCloseAlertUrl(simulatorUrl, 'alerts/123/close')
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: jsmManagementActionId,
              data: jsmSuccessResponse,
            });
          });

          it('should close an alert with an alias that is 512 characters', async () => {
            const alias = 'a'.repeat(512);

            const { body } = await supertest
              .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'closeAlert', subActionParams: { alias } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({});
            expect(simulator.requestUrl).to.eql(
              createCloseAlertUrl(simulatorUrl, `alerts/${alias}/close`)
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: jsmManagementActionId,
              data: jsmSuccessResponse,
            });
          });
        });

        describe('error response simulator', () => {
          const simulator = new JiraServiceManagementSimulator({
            returnError: true,
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let simulatorUrl: string;
          let jsmManagementActionId: string;

          before(async () => {
            simulatorUrl = await simulator.start();
            jsmManagementActionId = await createConnector(simulatorUrl);
          });

          after(() => {
            simulator.close();
          });

          it('should return a failure when attempting to create an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'createAlert',
                  subActionParams: { message: 'message', note: 'a note' },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message', note: 'a note' });
            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: true,
              connector_id: jsmManagementActionId,
              errorSource: TaskErrorSource.USER,
              service_message:
                'Status code: 422. Message: Request failed with status code 422: {"message":"failed"}',
            });
          });

          it('should return a failure when attempting to close an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${jsmManagementActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'closeAlert',
                  subActionParams: { alias: '123' },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({});
            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: true,
              connector_id: jsmManagementActionId,
              errorSource: TaskErrorSource.USER,
              service_message:
                'Status code: 422. Message: Request failed with status code 422: {"message":"failed"}',
            });
          });
        });
      });

      const createConnector = async (url: string) => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A Jira Service Management simulator',
            connector_type_id: '.jira-service-management',
            config: {
              apiUrl: url,
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(200);

        return body.id;
      };
    });
  });
}

const createCloseAlertUrl = (baseUrl: string, path: string) => {
  return createUrlString(baseUrl, path, { identifierType: 'alias' });
};

const createUrlString = (baseUrl: string, path: string, queryParams?: Record<string, string>) => {
  const fullURL = new URL(path, baseUrl + '/jsm/ops/integration/v2/');

  for (const [key, value] of Object.entries(queryParams ?? {})) {
    fullURL.searchParams.set(key, value);
  }

  return fullURL.toString();
};
