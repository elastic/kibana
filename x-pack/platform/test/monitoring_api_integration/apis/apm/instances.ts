/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import instancesResponse from '../../fixtures/apm/instances.json';
import instanceResponse from '../../fixtures/apm/instance.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'Instances',
    archiveRoot: 'x-pack/platform/test/monitoring_api_integration/archives/apm',
    getService,
  });

  const timeRange = { min: '2023-03-22T15:57:20.000Z', max: '2023-03-22T16:01:20.000Z' };

  testRunner(() => {
    it('should load apm servers', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/2aloVhnwR7K6CckdBgZ44w/apm/instances')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(instancesResponse);
    });

    it('should load individual apm server', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/2aloVhnwR7K6CckdBgZ44w/apm/ccf6c4d9-37bc-4dd0-bf57-2ae3ee296a39'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(instanceResponse);
    });
  });
}
