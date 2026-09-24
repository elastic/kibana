/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type httpProxy from 'http-proxy';
import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { Space1AllAtSpace1 } from '../../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function oauthPasswordTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const config = getService('config');
  const space = Space1AllAtSpace1.space;
  const objectRemover = new ObjectRemover(supertest);

  describe('OAuth Password Grant', () => {
    let proxyServer: httpProxy | undefined;
    let simulatorUrl: string;

    before(async () => {
      proxyServer = await getHttpProxyServer(
        kibanaServer.resolveUrl('/'),
        config.get('kbnTestServer.serverArgs'),
        () => {}
      );
      const url = new URL(
        kibanaServer.resolveUrl(
          getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
        )
      );
      url.username = '';
      url.password = '';
      simulatorUrl = url.toString();
    });

    after(async () => {
      await objectRemover.removeAll();
      proxyServer?.close();
    });

    const createConnector = async (options: Record<string, string> = {}): Promise<string> => {
      const { body } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OAuth password grant',
          connector_type_id: 'test.oauth-executor',
          config: { echoUrl: `${simulatorUrl}/echo` },
          secrets: {
            authType: 'oauth_password',
            tokenUrl: `${simulatorUrl}/oauth_token.do`,
            username: 'password-grant@example.com',
            password: 'password-grant-password',
            clientId: 'password-grant-client-id',
            ...options,
          },
        })
        .expect(200);
      objectRemover.add(space.id, body.id, 'connector', 'actions');
      return body.id;
    };

    const executeConnector = (id: string) =>
      supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector/${id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({ params: {} })
        .expect(200);

    const scenarios: Array<{
      name: string;
      options: Record<string, string>;
      expectedAuth: RegExp;
    }> = [
      {
        name: 'standard form request with unchanged token type',
        options: {},
        expectedAuth: /^bearer sim-oauth-password-\d+$/,
      },
      {
        name: 'email JSON request with an explicit Bearer override',
        options: { usernameField: 'email', requestBodyFormat: 'json', tokenType: 'Bearer' },
        expectedAuth: /^Bearer sim-oauth-password-\d+$/,
      },
    ];
    for (const { name, options, expectedAuth } of scenarios) {
      it(`attaches and reuses a token for the ${name}`, async () => {
        const id = await createConnector(options);
        const { body: first } = await executeConnector(id);
        expect(first.status).to.be('ok');
        expect(first.data.receivedAuth).to.match(expectedAuth);

        const { body: second } = await executeConnector(id);
        expect(second.status).to.be('ok');
        expect(second.data.receivedAuth).to.be(first.data.receivedAuth);
      });
    }

    it('requests a new token after the stored token expires', async () => {
      const id = await createConnector({ scope: 'short-lived' });
      const { body: first } = await executeConnector(id);
      expect(first.status).to.be('ok');
      expect(first.data.receivedAuth).to.match(/^bearer sim-oauth-password-\d+$/);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const { body: second } = await executeConnector(id);
      expect(second.status).to.be('ok');
      expect(second.data.receivedAuth).to.match(/^bearer sim-oauth-password-\d+$/);
      expect(second.data.receivedAuth).not.to.be(first.data.receivedAuth);
    });

    it('rejects invalid credentials without exposing them in the error', async () => {
      const id = await createConnector({ password: 'invalid-password' });
      const { body } = await executeConnector(id);
      expect(body.status).to.be('error');
      expect(body.service_message).to.be('OAuth password token request failed (HTTP 400).');
      expect(JSON.stringify(body)).not.to.contain('invalid-password');
    });
  });
}
