/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import response from '../../fixtures/apm/overview.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'Overview',
    archiveRoot: 'x-pack/platform/test/monitoring_api_integration/archives/apm',
    getService,
  });

  const timeRange = { min: '2023-03-22T15:57:20.000Z', max: '2023-03-22T16:01:20.000Z' };

  testRunner(() => {
    it('should summarize apm cluster with metrics', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/2aloVhnwR7K6CckdBgZ44w/apm')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(response);
    });
  });
}
