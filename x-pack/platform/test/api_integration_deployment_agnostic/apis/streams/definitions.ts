/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');

  describe('Streams Preconfigured Definitions', () => {
    it(`materializes backing data streams for wired root streams`, async () => {
      for (const streamName of ['logs.ecs', 'logs.otel']) {
        const response = await esClient.indices.getDataStream({ name: streamName });
        expect(response.data_streams).to.have.length(1);
        expect(response.data_streams[0].name).to.be(streamName);
      }
    });
  });
}
