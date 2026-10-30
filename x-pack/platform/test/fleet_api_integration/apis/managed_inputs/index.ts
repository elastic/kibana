/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function loadTests({ loadTestFile, getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Managed Inputs', () => {
    // Drain the Fleet setup started at Kibana boot, which the suites' own setup() would dedupe onto.
    before(async () => {
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'xxxx').expect(200);
    });

    loadTestFile(require.resolve('./managed_bulk_output'));
    loadTestFile(require.resolve('./managed_otlp_output'));
  });
}
