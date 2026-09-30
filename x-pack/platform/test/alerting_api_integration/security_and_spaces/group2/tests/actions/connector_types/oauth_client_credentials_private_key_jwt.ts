/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateKeyPairSync } from 'crypto';
import expect from '@kbn/expect';
import type httpProxy from 'http-proxy';
import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { SHORT_EXPIRY_CLIENT_CREDENTIALS_SCOPE } from '@kbn/actions-simulators-plugin/server/servicenow_oauth_simulation';
import { Space1AllAtSpace1 } from '../../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// Token shapes emitted by the `client_credentials` branch of `oauth_token.do`; keep these in sync with `servicenow_oauth_simulation.ts`.
const SIMULATOR_JWT_ACCESS_TOKEN_AUTH = /^Bearer sim-oauth-jwt-access-\d+$/;

// `kibanaServer.resolveUrl()` embeds basic-auth test credentials; the connector calls `/echo` with Bearer OAuth only.
function stripUrlCredentials(url: string): string {
  const u = new URL(url);
  u.username = '';
  u.password = '';
  return u.toString();
}

export default function oauthClientCredentialsPrivateKeyJwtTests({
  getService,
}: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  describe('OAuth Client Credentials Private Key JWT', () => {
    const objectRemover = new ObjectRemover(supertest);
    const space = Space1AllAtSpace1.space;
    let proxyServer: httpProxy | undefined;
    let privateKeyPem: string;

    before(async () => {
      proxyServer = await getHttpProxyServer(
        kibanaServer.resolveUrl('/'),
        configService.get('kbnTestServer.serverArgs'),
        () => {}
      );

      // Generated per-suite so the test does not depend on a checked-in key fixture; RSA + RS256 + kid binding mirrors Okta / Auth0 usage.
      const { privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
      });
      privateKeyPem = privateKey;
    });

    after(async () => {
      await objectRemover.removeAll();
      if (proxyServer) {
        proxyServer.close();
      }
    });

    function buildPrivateKeyJwtSecrets({
      tokenUrl,
      scope,
    }: {
      tokenUrl: string;
      scope?: string;
    }): Record<string, string> {
      return {
        authType: 'oauth_client_credentials_private_key_jwt',
        tokenUrl,
        clientId: 'private-key-jwt-client-id',
        ...(scope ? { scope } : {}),
        algorithm: 'RS256',
        certificateBinding: 'kid',
        keyId: 'test-key-id',
        privateKey: privateKeyPem,
      };
    }

    it('attaches OAuth Bearer token from client_credentials + private_key_jwt to outgoing request', async () => {
      const simulatorBaseRaw = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
      const tokenUrl = `${simulatorBaseRaw}/oauth_token.do`;
      const echoUrl = `${stripUrlCredentials(simulatorBaseRaw)}/echo`;

      const { body: connector } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OAuth executor private_key_jwt connector',
          connector_type_id: 'test.oauth-executor',
          config: { echoUrl },
          secrets: buildPrivateKeyJwtSecrets({ tokenUrl }),
        })
        .expect(200);

      objectRemover.add(space.id, connector.id, 'connector', 'actions');

      const { body: executeBody } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector/${connector.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({ params: {} })
        .expect(200);

      expect(executeBody.status).to.be('ok');
      expect(executeBody.connector_id).to.be(connector.id);
      expect(executeBody.data.receivedAuth).to.match(SIMULATOR_JWT_ACCESS_TOKEN_AUTH);
    });

    it('re-runs the client_credentials grant once the cached token expires', async function () {
      const simulatorBaseRaw = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
      const tokenUrl = `${simulatorBaseRaw}/oauth_token.do`;
      const echoUrl = `${stripUrlCredentials(simulatorBaseRaw)}/echo`;

      const { body: connector } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OAuth executor private_key_jwt short-lived connector',
          connector_type_id: 'test.oauth-executor',
          config: { echoUrl },
          secrets: buildPrivateKeyJwtSecrets({
            tokenUrl,
            scope: SHORT_EXPIRY_CLIENT_CREDENTIALS_SCOPE,
          }),
        })
        .expect(200);

      objectRemover.add(space.id, connector.id, 'connector', 'actions');

      const { body: firstExecute } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector/${connector.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({ params: {} })
        .expect(200);

      expect(firstExecute.status).to.be('ok');
      const firstAuth: string = firstExecute.data.receivedAuth;
      expect(firstAuth).to.match(SIMULATOR_JWT_ACCESS_TOKEN_AUTH);

      // Simulator returns `expires_in: 1` for the short-lived scope; wait past that so the next execute triggers a fresh client_credentials exchange.
      await new Promise((r) => setTimeout(r, 1500));

      const { body: secondExecute } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector/${connector.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({ params: {} })
        .expect(200);

      expect(secondExecute.status).to.be('ok');
      const secondAuth: string = secondExecute.data.receivedAuth;
      expect(secondAuth).to.match(SIMULATOR_JWT_ACCESS_TOKEN_AUTH);
      // client_credentials has no refresh_token; the second execute must mint a brand-new token, so the seq number advances.
      expect(secondAuth).not.to.be(firstAuth);
    });
  });
}
