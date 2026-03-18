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
import { getHttpServer } from '@kbn/actions-simulators-plugin/server/plugin';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ObjectRemover } from '../../../common/lib';

export default function httpProxyBasicAuthTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');
  const objectRemover = new ObjectRemover(supertest);

  describe('http connector with xpack.actions.proxyUser and proxyPassword', () => {
    let httpSimulatorURL: string = '';
    let httpServer: http.Server;
    let proxyServer: http.Server | undefined;

    before(async () => {
      httpServer = await getHttpServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      httpServer.listen(availablePort);
      httpSimulatorURL = `http://localhost:${availablePort}`;

      proxyServer = (await getHttpProxyServer(
        httpSimulatorURL,
        configService.get('kbnTestServer.serverArgs'),
        () => {}
      )) as http.Server;
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    after(async () => {
      httpServer.close();
      proxyServer?.close();
    });

    it('succeeds when Kibana proxy credentials match the proxy', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'HTTP action via authenticated proxy',
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

      objectRemover.add('default', createdAction.id, 'connector', 'actions', false);

      const { body: result } = await supertest
        .post(`/api/actions/connector/${createdAction.id}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            method: 'POST',
            body: 'proxy_basic_auth_ok',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });
  });
}
