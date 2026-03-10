/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  const deletePackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('installing with tsds disabled', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    after(async () => {
      await deletePackage('nginx', '1.12.1-beta');
    });

    it('should upgrade with tsds disabled if nginx exists with tsds', async function () {
      const templateName = 'metrics-nginx.stubstatus';

      await supertest
        .post(`/api/fleet/epm/packages/nginx/1.12.0-beta`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      expect(await getIndexMode(templateName)).to.eql('time_series');

      await supertest
        .post(`/api/fleet/epm/packages/nginx/1.12.1-beta`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      expect(await getIndexMode(templateName)).to.be(undefined);
    });

    async function getIndexMode(templateName: string) {
      const { body: indexTemplateResponse } = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_index_template/${templateName}`,
        },
        { meta: true }
      );

      const indexTemplate = indexTemplateResponse.index_templates[0].index_template;
      return indexTemplate.template.settings.index?.mode;
    }
  });
}
