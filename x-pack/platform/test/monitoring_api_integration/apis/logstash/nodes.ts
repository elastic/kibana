/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import allNodesResponse from '../../fixtures/logstash/nodes.json';
import nodeDetailResponse from '../../fixtures/logstash/node_detail.json';
import nodeDetailAdvancedResponse from '../../fixtures/logstash/node_detail_advanced.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'Nodes',
    archiveRoot: 'x-pack/platform/test/monitoring_api_integration/archives/logstash/single_node',
    getService,
  });

  const timeRange = {
    min: '2023-03-01T18:03:00.000Z',
    max: '2023-03-01T18:06:40.000Z',
  };

  testRunner(() => {
    it('should summarize logstash nodes with stats', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/b0z1XQQNSyiV2y8bWz_zzQ/logstash/nodes')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(allNodesResponse);
    });

    it('should summarize the Logstash node with non-advanced chart data metrics', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/b0z1XQQNSyiV2y8bWz_zzQ/logstash/node/5d74947f-b537-4463-abfe-e7488cc04d4a'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, is_advanced: false })
        .expect(200);

      expect(body).to.eql(nodeDetailResponse);
    });

    it('should summarize the Logstash node with advanced chart data metrics', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/b0z1XQQNSyiV2y8bWz_zzQ/logstash/node/5d74947f-b537-4463-abfe-e7488cc04d4a'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, is_advanced: true })
        .expect(200);

      expect(body).to.eql(nodeDetailAdvancedResponse);
    });
  });
}
