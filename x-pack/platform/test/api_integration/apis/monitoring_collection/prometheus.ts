/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Prometheus endpoint', function () {
    this.tags(['skipCloud']);

    it('returns prometheus scraped metrics', async () => {
      await supertest.post('/api/generate_otel_metrics').set('kbn-xsrf', 'foo').expect(200);
      const response = await supertest.get('/api/monitoring_collection/v1/prometheus').expect(200);

      const cleanResponseText = response.text.replace(/\s+/g, ' ');

      // 1. Match the headers with the resource attributes
      expect(cleanResponseText).to.match(
        /^# HELP target_info Target metadata # TYPE target_info gauge target_info{((service_name|service_version|service_instance_id)=".+?",{0,1})+} 1/
      );

      // 2. Match the specific known counter reported in src/platform/test/common/plugins/otel_metrics/server/monitoring/metrics.ts
      expect(cleanResponseText).to.match(
        /# HELP request_count_total Counts total number of requests # TYPE request_count_total counter request_count_total [0-9]/
      );
    });
  });
}
