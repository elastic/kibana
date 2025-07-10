/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Prometheus endpoint', function () {
    this.tags(['skipCloud']);

    it('returns prometheus scraped metrics', async () => {
      await supertest.post('/api/generate_otel_metrics').set('kbn-xsrf', 'foo').expect(200);
      const response = await supertest.get('/api/monitoring_collection/v1/prometheus').expect(200);

      expect(response.text.replace(/\s+/g, ' ')).to.match(
        /^# HELP request_count_total Counts total number of requests # TYPE request_count_total counter request_count_total [0-9]/
      );
    });
  });
}
