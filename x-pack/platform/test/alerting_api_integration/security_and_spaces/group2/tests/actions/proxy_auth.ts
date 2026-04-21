/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type http from 'http';
import expect from '@kbn/expect';
import getPort from 'get-port';
import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import { getWebhookServer } from '@kbn/actions-simulators-plugin/server/plugin';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { ObjectRemover } from '../../../../common/lib';
import { ProxyAuthUser, ProxyAuthPassword } from '../../../../common/lib';

const BasicAuthCreds = Buffer.from(`${ProxyAuthUser}:${ProxyAuthPassword}`).toString('base64');
const BasicAuthHeader = `Basic ${BasicAuthCreds}`;

export default function httpProxyBasicAuthTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');
  const objectRemover = new ObjectRemover(supertest);

  describe('ensure proxy authentication works (with webhook)', () => {
    let webhookSimulatorURL: string = '';
    let webhookServer: http.Server;
    let proxyServer: http.Server | undefined;
    let proxyHasBeenCalled = false;
    let proxyAuthHeader = '';

    beforeEach(async () => {
      proxyHasBeenCalled = false;
      proxyAuthHeader = '';
    });

    before(async () => {
      webhookServer = await getWebhookServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      webhookServer.listen(availablePort);
      webhookSimulatorURL = `http://localhost:${availablePort}`;

      proxyServer = (await getHttpProxyServer(
        webhookSimulatorURL,
        configService.get('kbnTestServer.serverArgs'),
        (proxyRes, req, res) => {
          proxyHasBeenCalled = true;
        },
        (proxyReq, req, res) => {
          proxyAuthHeader = `${proxyReq?.getHeader('proxy-authorization')}`;
        }
      )) as unknown as http.Server;
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    after(async () => {
      webhookServer.close();
      proxyServer?.close();
    });

    it('succeeds when Kibana proxy credentials match the proxy', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'HTTP action via authenticated proxy',
          connector_type_id: '.webhook',
          config: {
            url: webhookSimulatorURL,
            hasAuth: false,
            authType: null,
            method: 'get',
          },
        })
        .expect(200);

      objectRemover.add('default', createdAction.id, 'connector', 'actions', false);

      const { body: result, statusCode } = await supertest
        .post(`/api/actions/connector/${createdAction.id}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({ params: {} });

      expect(statusCode).to.eql(200);
      expect(result.status).to.eql('ok');
      expect(proxyHasBeenCalled).to.be(true);
      expect(proxyAuthHeader).to.eql(BasicAuthHeader);
    });
  });
}
