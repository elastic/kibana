/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { platformCoreTools } from '@kbn/onechat-common';
import { AGENT_BUILDER_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

const testDataset = [
  [
    'What is the average price of the products in the dataset?',
    ['FROM kibana_sample_data_ecommerce\n| STATS AVG(products.price)'],
  ],
  [
    'What is the total revenue of the products in the dataset?',
    ['FROM kibana_sample_data_ecommerce\n| STATS total_revenue = SUM(taxful_total_price)'],
  ],
];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('generate_esql tool evaluation', () => {
    // after(async () => {
    //   await kibanaServer.uiSettings.update({
    //     [AGENT_BUILDER_ENABLED_SETTING_ID]: false,
    //   });
    // });

    before(async () => {
      await kibanaServer.uiSettings.update({
        [AGENT_BUILDER_ENABLED_SETTING_ID]: true,
      });
      // Load sample datasets before running tests
      await supertest.post('/api/sample_data/ecommerce').set('kbn-xsrf', 'true').expect(200);
      await supertest.post('/api/sample_data/flights').set('kbn-xsrf', 'true').expect(200);
      await supertest.post('/api/sample_data/logs').set('kbn-xsrf', 'true').expect(200);
    });

    after(async () => {
      // Clean up sample datasets after tests
      await supertest.delete('/api/sample_data/ecommerce').set('kbn-xsrf', 'true').expect(204);
      await supertest.delete('/api/sample_data/flights').set('kbn-xsrf', 'true').expect(204);
      await supertest.delete('/api/sample_data/logs').set('kbn-xsrf', 'true').expect(204);
    });

    let i = 0;
    let ok = 0;
    for (const [query, expected] of testDataset) {
      i++;
      it(`testing generate_esql tool ${i}/${testDataset.length}`, async () => {
        const executeRequest = {
          tool_id: platformCoreTools.generateEsql,
          tool_params: {
            query,
          },
        };

        const response = await supertest
          .post('/api/agent_builder/tools/_execute')
          .set('kbn-xsrf', 'kibana')
          .send(executeRequest)
          .expect(200);

        expect(response.body).to.have.property('results');
        expect(expected.includes(response.body.results[0].data.esql)).to.be(true);
        ok++;
      });
    }
    // eslint-disable-next-line no-console
    console.log(`${ok}/${i} tests passed`);
  });
}
