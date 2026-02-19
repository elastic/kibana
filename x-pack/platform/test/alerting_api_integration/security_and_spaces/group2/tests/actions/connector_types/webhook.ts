/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type httpProxy from 'http-proxy';
import type http from 'http';
import expect from '@kbn/expect';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { URL, format as formatUrl } from 'url';
import getPort from 'get-port';
import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import type { OAuth2Server } from '@kbn/alerting-api-integration-helpers/get_auth_server';
import { getOAuth2Server } from '@kbn/alerting-api-integration-helpers/get_auth_server';
import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
  getWebhookServer,
} from '@kbn/actions-simulators-plugin/server/plugin';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog, ObjectRemover } from '../../../../../common/lib';

const defaultValues: Record<string, any> = {
  headers: null,
  method: 'post',
  hasAuth: true,
};

function parsePort(url: Record<string, string>): Record<string, string | null | number> {
  return {
    ...url,
    port: url.port ? parseInt(url.port, 10) : url.port,
  };
}

export default function webhookTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');
  const retry = getService('retry');
  const objectRemover = new ObjectRemover(supertest);

  async function createWebhookAction(
    webhookSimulatorURL: string,
    config: Record<string, string | Record<string, string>> = {},
    kibanaUrlWithCreds: string
  ): Promise<string> {
    const { user, password } = extractCredentialsFromUrl(kibanaUrlWithCreds);
    const url =
      config.url && typeof config.url === 'object' ? parsePort(config.url) : webhookSimulatorURL;
    const composedConfig = {
      headers: {
        'Content-Type': 'text/plain',
      },
      ...config,
      url,
    };

    const { body: createdAction } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'test')
      .send({
        name: 'A generic Webhook action',
        connector_type_id: '.webhook',
        secrets: {
          user,
          password,
        },
        config: composedConfig,
      })
      .expect(200);

    objectRemover.add('default', createdAction.id, 'connector', 'actions', false);

    return createdAction.id;
  }

  describe('webhook action', () => {
    let webhookSimulatorURL: string = '';
    let webhookServer: http.Server;
    let kibanaURL: string = '<could not determine kibana url>';
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    // need to wait for kibanaServer to settle ...
    before(async () => {
      webhookServer = await getWebhookServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      webhookServer.listen(availablePort);
      webhookSimulatorURL = `http://localhost:${availablePort}`;

      kibanaURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.WEBHOOK)
      );

      proxyServer = await getHttpProxyServer(
        webhookSimulatorURL,
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should return 200 when creating a webhook connector successfully with default method', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Webhook action',
          connector_type_id: '.webhook',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: webhookSimulatorURL,
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        name: 'A generic Webhook action',
        connector_type_id: '.webhook',
        is_missing_secrets: false,
        config: {
          ...defaultValues,
          url: webhookSimulatorURL,
        },
        is_connector_type_deprecated: false,
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        name: 'A generic Webhook action',
        connector_type_id: '.webhook',
        is_missing_secrets: false,
        config: {
          ...defaultValues,
          url: webhookSimulatorURL,
        },
        is_connector_type_deprecated: false,
      });
    });

    for (const method of ['post', 'put', 'patch', 'get', 'delete']) {
      it(`should return 200 when creating a webhook connector successfully with ${method} method`, async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'test')
          .send({
            name: 'A generic Webhook action',
            connector_type_id: '.webhook',
            secrets: {
              user: 'username',
              password: 'mypassphrase',
            },
            config: {
              url: webhookSimulatorURL,
              method,
            },
          })
          .expect(200);

        const expectedResult = {
          id: createdAction.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name: 'A generic Webhook action',
          connector_type_id: '.webhook',
          is_missing_secrets: false,
          config: {
            ...defaultValues,
            url: webhookSimulatorURL,
            method,
          },
          is_connector_type_deprecated: false,
        };

        expect(createdAction).to.eql(expectedResult);

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/connector/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql(expectedResult);
      });
    }

    it('should remove headers when a webhook is updated', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Webhook action',
          connector_type_id: '.webhook',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: webhookSimulatorURL,
            headers: {
              someHeader: '123',
            },
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        name: 'A generic Webhook action',
        connector_type_id: '.webhook',
        is_missing_secrets: false,
        config: {
          ...defaultValues,
          url: webhookSimulatorURL,
          headers: {
            someHeader: '123',
          },
        },
        is_connector_type_deprecated: false,
      });

      await supertest
        .put(`/api/actions/connector/${createdAction.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A generic Webhook action',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: webhookSimulatorURL,
            headers: {
              someOtherHeader: '456',
            },
          },
        })
        .expect(200);

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        name: 'A generic Webhook action',
        connector_type_id: '.webhook',
        is_missing_secrets: false,
        config: {
          ...defaultValues,
          url: webhookSimulatorURL,
          headers: {
            someOtherHeader: '456',
          },
        },
        is_connector_type_deprecated: false,
      });
    });

    it('should send authentication to the webhook target', async () => {
      const webhookActionId = await createWebhookAction(webhookSimulatorURL, {}, kibanaURL);
      const { body: result } = await supertest
        .post(`/api/actions/connector/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'authenticate',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });

    it('should support the POST method against webhook target', async () => {
      const webhookActionId = await createWebhookAction(
        webhookSimulatorURL,
        { method: 'post' },
        kibanaURL
      );
      const { body: result } = await supertest
        .post(`/api/actions/connector/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'success_post_method',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');

      const events: IValidatedEvent[] = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'default',
          type: 'action',
          id: webhookActionId,
          provider: 'actions',
          actions: new Map([
            ['execute-start', { gte: 1 }],
            ['execute', { gte: 1 }],
          ]),
        });
      });

      const executeEvent = events[1];
      expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(19);
    });

    it('should support the PUT method against webhook target', async () => {
      const webhookActionId = await createWebhookAction(
        webhookSimulatorURL,
        { method: 'put' },
        kibanaURL
      );
      const { body: result } = await supertest
        .post(`/api/actions/connector/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'success_put_method',
          },
        })
        .expect(200);

      expect(proxyHaveBeenCalled).to.equal(true);
      expect(result.status).to.eql('ok');
    });

    it('should support the PATCH method against webhook target', async () => {
      const webhookActionId = await createWebhookAction(
        webhookSimulatorURL,
        { method: 'patch' },
        kibanaURL
      );
      const { body: result } = await supertest
        .post(`/api/actions/connector/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'success_patch_method',
          },
        })
        .expect(200);

      expect(proxyHaveBeenCalled).to.equal(true);
      expect(result.status).to.eql('ok');
    });

    it('should support the GET method against webhook target', async () => {
      const webhookActionId = await createWebhookAction(
        webhookSimulatorURL,
        { method: 'get' },
        kibanaURL
      );
      const { body: result } = await supertest
        .post(`/api/actions/connector/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({ params: {} })
        .expect(200);

      expect(proxyHaveBeenCalled).to.equal(true);
      expect(result.status).to.eql('ok');
    });

    it('should support the DELETE method against webhook target', async () => {
      const webhookActionId = await createWebhookAction(
        webhookSimulatorURL,
        { method: 'delete' },
        kibanaURL
      );
      const { body: result } = await supertest
        .post(`/api/actions/connector/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({ params: {} })
        .expect(200);

      expect(proxyHaveBeenCalled).to.equal(true);
      expect(result.status).to.eql('ok');
    });

    it('should handle target webhooks that are not added to allowedHosts', async () => {
      const { body: result } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Webhook action',
          connector_type_id: '.webhook',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: 'http://a.none.allowedHosts.webhook/endpoint',
          },
        })
        .expect(400);

      expect(result.error).to.eql('Bad Request');
      expect(result.message).to.match(/is not added to the Kibana config/);
    });

    it('should handle unreachable webhook targets', async () => {
      const webhookActionId = await createWebhookAction(
        'http://some.non.existent.com/endpoint',
        {},
        kibanaURL
      );
      const { body: result } = await supertest
        .post(`/api/actions/connector/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'failure',
          },
        })
        .expect(200);

      expect(result.status).to.eql('error');
      expect(result.message).to.match(/error calling webhook, retry later/);
    });

    it('should handle failing webhook targets', async () => {
      const webhookActionId = await createWebhookAction(webhookSimulatorURL, {}, kibanaURL);
      const { body: result } = await supertest
        .post(`/api/actions/connector/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'failure',
          },
        })
        .expect(200);

      expect(result.status).to.eql('error');
      expect(result.message).to.match(/error calling webhook, retry later/);
      expect(result.service_message).to.eql('[500] Internal Server Error');
    });

    it('sends both config and secret headers in the webhook request', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Webhook action',
          connector_type_id: '.webhook',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
            secretHeaders: {
              secret: 'secretValue',
            },
          },
          config: {
            url: webhookSimulatorURL,
            headers: {
              config: 'configValue',
            },
          },
        })
        .expect(200);

      // execute the connector
      const actionId = createdAction.id;
      const { body: result } = await supertest
        .post(`/api/actions/connector/${actionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'success_config_secret_headers',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });

    describe('getWebhookSecretHeadersKeyRoute', () => {
      it('returns only secret headers keys for the webhook connector', async () => {
        const { body: webhookConnector } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'test')
          .send({
            name: 'A generic Webhook action',
            connector_type_id: '.webhook',
            secrets: {
              user: 'user',
              password: 'pass',
              secretHeaders: {
                secretKey1: 'secretValue1',
                secretKey2: 'secretValue2',
                secretKey3: 'secretValue3',
              },
            },
            config: {
              url: webhookSimulatorURL,
            },
          })
          .expect(200);

        const connectorId = webhookConnector.id;

        // get secret headers from getWebhookSecretHeadersKeyRoute
        const { body: result } = await supertest
          .get(`/internal/stack_connectors/${connectorId}/secret_headers`)
          .set('kbn-xsrf', 'test')
          .expect(200);

        expect(result).to.eql(['secretKey1', 'secretKey2', 'secretKey3']);
      });

      it('returns empty array if no secret headers provided', async () => {
        const { body: webhookConnector } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'test')
          .send({
            name: 'A generic Webhook action',
            connector_type_id: '.webhook',
            secrets: {
              user: 'user',
              password: 'pass',
            },
            config: {
              url: webhookSimulatorURL,
            },
          })
          .expect(200);

        const connectorId = webhookConnector.id;

        const { body: result } = await supertest
          .get(`/internal/stack_connectors/${connectorId}/secret_headers`)
          .set('kbn-xsrf', 'test')
          .expect(200);

        expect(result).to.eql([]);
      });

      it('rejects non-webhook connector types', async () => {
        const { body: emailConnector } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'test')
          .send({
            name: 'An email action',
            connector_type_id: '.email',
            config: {
              service: '__json',
              from: 'bob@example.com',
              hasAuth: true,
            },
            secrets: {
              user: 'bob',
              password: 'supersecret',
            },
          })
          .expect(200);

        const connectorId = emailConnector.id;

        const { body: result } = await supertest
          .get(`/internal/stack_connectors/${connectorId}/secret_headers`)
          .set('kbn-xsrf', 'test')
          .expect(400);

        expect(result.message).to.match(
          /Connector must be one of the following types: \.webhook, \.cases-webhook, \.mcp/
        );
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/236174
    describe.skip('OAuth2 client credentials', () => {
      let oauth2Server: OAuth2Server;
      let webhookActionId: string = '';
      const clientId = 'test-client-id';
      const clientSecret = 'test-client-secret';

      before(async () => {
        oauth2Server = await getOAuth2Server();
        const { body: connector } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'test')
          .send({
            name: 'A OAuth2 Webhook action',
            connector_type_id: '.webhook',
            config: {
              headers: { 'Content-Type': 'text/plain' },
              url: webhookSimulatorURL,
              hasAuth: true,
              authType: 'webhook-oauth2-client-credentials',
              accessTokenUrl: oauth2Server.getAccessTokenUrl(),
              clientId,
            },
            secrets: {
              clientSecret,
            },
          })
          .expect(200);

        webhookActionId = connector.id;
      });

      after(() => {
        oauth2Server.server.close();
      });

      afterEach(() => {
        oauth2Server.reset();
      });

      it('should get access token with client credentials', async () => {
        const { body: result } = await supertest
          .post(`/api/actions/connector/${webhookActionId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              body: 'header_as_payload',
            },
          })
          .expect(200);

        // this is the Kibana response to our connector "test" execution
        expect(result).to.eql({
          status: 'ok',
          connector_id: webhookActionId,
          data: 'header_as_payload',
        });

        // this is the request that Kibana did to the auth server
        // before calling the webhook server
        const tokenRequests = oauth2Server.getTokenRequests();
        expect(tokenRequests.length).to.be(1);
        expect(tokenRequests[0].client_id).to.be(clientId);
        expect(tokenRequests[0].client_secret).to.be(clientSecret);
        expect(tokenRequests[0].grant_type).to.be('client_credentials');
        expect(tokenRequests[0].token).to.be('test-token-1');

        // this is the request Kibana did to the webhook server
        // it returns headers because we are sending body: 'header_as_payload'
        const webhookSimulatorHeadersRaw = await fetch(webhookSimulatorURL);
        const webhookSimulatorHeaders = await webhookSimulatorHeadersRaw.json();
        expect(webhookSimulatorHeaders.length).to.be(1);
        expect(JSON.parse(webhookSimulatorHeaders[0]).authorization).to.equal(
          'Bearer test-token-1'
        );
      });

      it('should refresh the token once the previous one has expired', async () => {
        // first call will generate a token as we could see in the previous test
        await supertest
          .post(`/api/actions/connector/${webhookActionId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              body: 'header_as_payload',
            },
          })
          .expect(200);

        // waits enough for the token to be expired plus some buffer
        await new Promise((resolve) =>
          setTimeout(resolve, oauth2Server.getTokenExpirationTime() * 2 * 1000)
        );

        // this second call should trigger a second call to the auth server because
        // the token will be expired
        const { body: result } = await supertest
          .post(`/api/actions/connector/${webhookActionId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              body: 'header_as_payload',
            },
          })
          .expect(200);

        // this is the Kibana response to our connector "test" execution
        expect(result).to.eql({
          status: 'ok',
          connector_id: webhookActionId,
          data: 'header_as_payload',
        });

        // this is the request that Kibana did to the auth server
        // before calling the webhook server
        const tokenRequests = oauth2Server.getTokenRequests();
        expect(tokenRequests.length).to.be(2);
        expect(tokenRequests[1].client_id).to.be(clientId);
        expect(tokenRequests[1].client_secret).to.be(clientSecret);
        expect(tokenRequests[1].grant_type).to.be('client_credentials');
        expect(tokenRequests[1].token).to.be('test-token-2');

        // this is the request Kibana did to the webhook server
        // it returns headers because we are sending body: 'header_as_payload'
        const webhookSimulatorHeadersRaw = await fetch(webhookSimulatorURL);
        const webhookSimulatorHeaders = await webhookSimulatorHeadersRaw.json();
        expect(webhookSimulatorHeaders.length).to.be(2);
        expect(JSON.parse(webhookSimulatorHeaders[1]).authorization).to.equal(
          'Bearer test-token-2'
        );
      });
    });

    after(() => {
      webhookServer.close();
      if (proxyServer) {
        proxyServer.close();
      }
    });
  });
}

function extractCredentialsFromUrl(url: string): { url: string; user: string; password: string } {
  const parsedUrl = new URL(url);
  const { password, username: user } = parsedUrl;
  return { url: formatUrl(parsedUrl, { auth: false }), user, password };
}
