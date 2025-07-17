/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import instancesResponse from '../../fixtures/kibana/instances.json';
import instanceResponse from '../../fixtures/kibana/instance.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'Instances',
    archiveRoot: 'x-pack/platform/test/monitoring_api_integration/archives/kibana/single_node',
    getService,
  });

  const timeRange = {
    min: '2023-03-14T12:53:50.000Z',
    max: '2023-03-14T13:03:30.000Z',
  };

  testRunner(() => {
    it('should summarize list of kibana instances with stats', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/rSEDbJNIQmOE-v9n2rV5cA/kibana/instances')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(instancesResponse);
    });

    it('should summarize single kibana instance with metrics', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/rSEDbJNIQmOE-v9n2rV5cA/kibana/2eae9cd1-7305-4f3e-9381-dbf1975bf624'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(instanceResponse);
    });
  });
}
