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
  getHttpServer,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { AuthType } from '@kbn/connector-schemas/common/auth/constants';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog, ObjectRemover } from '../../../../../common/lib';

const defaultValues: Record<string, any> = {
  headers: null,
  hasAuth: true,
};

function parsePort(url: Record<string, string>): Record<string, string | null | number> {
  return {
    ...url,
    port: url.port ? parseInt(url.port, 10) : url.port,
  };
}

export default function httpTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');
  const retry = getService('retry');
  const objectRemover = new ObjectRemover(supertest);

  async function createHttpAction(
    httpSimulatorURL: string,
    kibanaUrlWithCreds: string,
    config: Record<string, string | Record<string, string>> = {}
  ): Promise<string> {
    const { user, password } = extractCredentialsFromUrl(kibanaUrlWithCreds);
    const url =
      config.url && typeof config.url === 'object' ? parsePort(config.url) : httpSimulatorURL;
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
        name: 'A generic Http action',
        connector_type_id: '.http',
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

  describe('http action', () => {
    let httpSimulatorURL: string = '';
    let httpServer: http.Server;
    let kibanaURL: string = '<could not determine kibana url>';
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    // need to wait for kibanaServer to settle ...
    before(async () => {
      httpServer = await getHttpServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      httpServer.listen(availablePort);
      httpSimulatorURL = `http://localhost:${availablePort}`;

      kibanaURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.WEBHOOK)
      );

      proxyServer = await getHttpProxyServer(
        httpSimulatorURL,
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should return 200 when creating a http connector successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Http action',
          connector_type_id: '.http',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: httpSimulatorURL,
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        name: 'A generic Http action',
        connector_type_id: '.http',
        is_missing_secrets: false,
        config: {
          ...defaultValues,
          url: httpSimulatorURL,
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
        name: 'A generic Http action',
        connector_type_id: '.http',
        is_missing_secrets: false,
        config: {
          ...defaultValues,
          url: httpSimulatorURL,
        },
        is_connector_type_deprecated: false,
      });
    });

    it('should remove headers when a http is updated', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Http action',
          connector_type_id: '.http',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: httpSimulatorURL,
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
        name: 'A generic Http action',
        connector_type_id: '.http',
        is_missing_secrets: false,
        config: {
          ...defaultValues,
          url: httpSimulatorURL,
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
          name: 'A generic Http action',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: httpSimulatorURL,
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
        name: 'A generic Http action',
        connector_type_id: '.http',
        is_missing_secrets: false,
        config: {
          ...defaultValues,
          url: httpSimulatorURL,
          headers: {
            someOtherHeader: '456',
          },
        },
        is_connector_type_deprecated: false,
      });
    });

    it('should send authentication to the http target', async () => {
      const httpActionId = await createHttpAction(httpSimulatorURL, kibanaURL);
      const { body: result } = await supertest
        .post(`/api/actions/connector/${httpActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'authenticate',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });

    for (const method of ['POST', 'PUT', 'PATCH', 'GET', 'DELETE']) {
      it(`should support the ${method} method against http target`, async () => {
        const httpActionId = await createHttpAction(httpSimulatorURL, kibanaURL);
        const { body: result } = await supertest
          .post(`/api/actions/connector/${httpActionId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              body: `success_${method.toLowerCase()}_method`,
              method,
            },
          })
          .expect(200);

        expect(result.status).to.eql('ok');

        const events: IValidatedEvent[] = await retry.try(async () => {
          return await getEventLog({
            getService,
            spaceId: 'default',
            type: 'action',
            id: httpActionId,
            provider: 'actions',
            actions: new Map([
              ['execute-start', { gte: 1 }],
              ['execute', { gte: 1 }],
            ]),
          });
        });

        expect(proxyHaveBeenCalled).to.equal(true);
        const executeEvent = events[1];
        expect(executeEvent?.kibana?.action?.execution?.source).to.be('http_request');
      });
    }

    it('should handle target https that are not added to allowedHosts', async () => {
      const { body: result } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Http action',
          connector_type_id: '.http',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: 'http://a.none.allowedHosts.http/endpoint',
          },
        })
        .expect(400);

      expect(result.error).to.eql('Bad Request');
      expect(result.message).to.match(/is not added to the Kibana config/);
    });

    it('should handle unreachable http targets', async () => {
      const httpActionId = await createHttpAction(
        'http://some.non.existent.com/endpoint',
        kibanaURL
      );
      const { body: result } = await supertest
        .post(`/api/actions/connector/${httpActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            method: 'POST',
            body: 'failure',
          },
        })
        .expect(200);

      expect(result.status).to.eql('error');
      expect(result.message).to.match(/error calling http, retry later/);
    });

    it('should handle failing http targets', async () => {
      const httpActionId = await createHttpAction(httpSimulatorURL, kibanaURL);
      const { body: result } = await supertest
        .post(`/api/actions/connector/${httpActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            method: 'POST',
            body: 'failure',
          },
        })
        .expect(200);

      expect(result.status).to.eql('error');
      expect(result.message).to.match(/error calling http, retry later/);
      expect(result.service_message).to.eql('[500] Internal Server Error');
    });

    it('sends both config and secret headers in the http request', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Http action',
          connector_type_id: '.http',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
            secretHeaders: {
              secret: 'secretValue',
            },
          },
          config: {
            url: httpSimulatorURL,
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

    describe('getHttpSecretHeadersKeyRoute', () => {
      it('returns only secret headers keys for the http connector', async () => {
        const { body: httpConnector } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'test')
          .send({
            name: 'A generic Http action',
            connector_type_id: '.http',
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
              url: httpSimulatorURL,
            },
          })
          .expect(200);

        const connectorId = httpConnector.id;

        // get secret headers from getHttpSecretHeadersKeyRoute
        const { body: result } = await supertest
          .get(`/internal/stack_connectors/${connectorId}/secret_headers`)
          .set('kbn-xsrf', 'test')
          .expect(200);

        expect(result).to.eql(['secretKey1', 'secretKey2', 'secretKey3']);
      });

      it('returns empty array if no secret headers provided', async () => {
        const { body: httpConnector } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'test')
          .send({
            name: 'A generic Http action',
            connector_type_id: '.http',
            secrets: {
              user: 'user',
              password: 'pass',
            },
            config: {
              url: httpSimulatorURL,
            },
          })
          .expect(200);

        const connectorId = httpConnector.id;

        const { body: result } = await supertest
          .get(`/internal/stack_connectors/${connectorId}/secret_headers`)
          .set('kbn-xsrf', 'test')
          .expect(200);

        expect(result).to.eql([]);
      });

      it('rejects non-http connector types', async () => {
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

        expect(result.message).to.match(/Connector must be one of the following types/);
      });
    });

    describe('OAuth2 client credentials', () => {
      let oauth2Server: OAuth2Server;
      let httpActionId: string = '';
      const clientId = 'test-client-id';
      const clientSecret = 'test-client-secret';

      before(async () => {
        oauth2Server = await getOAuth2Server();
        const { body: connector } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'test')
          .send({
            name: 'A OAuth2 Http action',
            connector_type_id: '.http',
            config: {
              headers: { 'Content-Type': 'text/plain' },
              url: httpSimulatorURL,
              hasAuth: true,
              authType: AuthType.OAuth2ClientCredentials,
              accessTokenUrl: oauth2Server.getAccessTokenUrl(),
              clientId,
            },
            secrets: {
              clientSecret,
            },
          })
          .expect(200);

        httpActionId = connector.id;
      });

      after(() => {
        oauth2Server.server.close();
      });

      afterEach(() => {
        oauth2Server.reset();
      });

      it('should get access token with client credentials', async () => {
        const { body: result } = await supertest
          .post(`/api/actions/connector/${httpActionId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              method: 'POST',
              body: 'header_as_payload',
            },
          })
          .expect(200);

        // HTTP connector returns data: { status, statusText, headers, data }; simulator responds with body 'OK'
        expect(result.status).to.eql('ok');
        expect(result.connector_id).to.eql(httpActionId);
        expect(result.data?.data).to.eql('OK');

        // this is the request that Kibana did to the auth server
        // before calling the http server
        const tokenRequests = oauth2Server.getTokenRequests();
        expect(tokenRequests.length).to.be(1);
        expect(tokenRequests[0].client_id).to.be(clientId);
        expect(tokenRequests[0].client_secret).to.be(clientSecret);
        expect(tokenRequests[0].grant_type).to.be('client_credentials');
        expect(tokenRequests[0].token).to.be('test-token-1');

        // this is the request Kibana did to the http server
        // it returns headers because we are sending body: 'header_as_payload'
        const httpSimulatorHeadersRaw = await fetch(httpSimulatorURL);
        const httpSimulatorHeaders = await httpSimulatorHeadersRaw.json();
        expect(httpSimulatorHeaders.length).to.be(1);
        expect(JSON.parse(httpSimulatorHeaders[0]).authorization).to.equal('Bearer test-token-1');
      });

      it('should refresh the token once the previous one has expired', async () => {
        // first call will generate a token as we could see in the previous test
        await supertest
          .post(`/api/actions/connector/${httpActionId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              method: 'POST',
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
          .post(`/api/actions/connector/${httpActionId}/_execute`)
          .set('kbn-xsrf', 'test')
          .send({
            params: {
              method: 'POST',
              body: 'header_as_payload',
            },
          })
          .expect(200);

        // HTTP connector returns data: { status, statusText, headers, data }; simulator responds with body 'OK'
        expect(result.status).to.eql('ok');
        expect(result.connector_id).to.eql(httpActionId);
        expect(result.data?.data).to.eql('OK');

        // this is the request that Kibana did to the auth server
        // before calling the http server
        const tokenRequests = oauth2Server.getTokenRequests();
        expect(tokenRequests.length).to.be(2);
        expect(tokenRequests[1].client_id).to.be(clientId);
        expect(tokenRequests[1].client_secret).to.be(clientSecret);
        expect(tokenRequests[1].grant_type).to.be('client_credentials');
        expect(tokenRequests[1].token).to.be('test-token-2');

        // this is the request Kibana did to the http server
        // it returns headers because we are sending body: 'header_as_payload'
        const httpSimulatorHeadersRaw = await fetch(httpSimulatorURL);
        const httpSimulatorHeaders = await httpSimulatorHeadersRaw.json();
        expect(httpSimulatorHeaders.length).to.be(2);
        expect(JSON.parse(httpSimulatorHeaders[1]).authorization).to.equal('Bearer test-token-2');
      });
    });

    after(() => {
      httpServer.close();
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
