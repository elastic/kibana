/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import fs from 'fs';
import path from 'path';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const PKG_NAME = 'integration_otel';
const PKG_VERSION = '1.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');

  const testPkgArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/integration_otel_1.0.0.zip'
  );

  const uninstallPackage = async (name: string, version: string) => {
    await supertest
      .delete(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const uploadPackage = async (buf: NonSharedBuffer) => {
    return await supertest
      .post(`/api/fleet/epm/packages`)
      .set('kbn-xsrf', 'xxxx')
      .type('application/zip')
      .send(buf);
  };

  describe('EPM Templates - OTel config generation for integration packages', () => {
    before(async () => {
      await fleetAndAgents.setup();
      const buf = fs.readFileSync(testPkgArchiveZip);
      let res = await uploadPackage(buf);
      if (res.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        res = await uploadPackage(buf);
      }
      expect(res.status).to.be(200);
    });

    after(async () => {
      await uninstallPackage(PKG_NAME, PKG_VERSION);
    });

    it('returns OTel collector config sections at the top level for integration packages with otelcol input', async () => {
      const res = await supertest
        .get(`/api/fleet/epm/templates/${PKG_NAME}/${PKG_VERSION}/inputs?format=json`)
        .expect(200);

      const body = res.body as {
        inputs: Array<{ type: string }>;
        receivers?: Record<string, unknown>;
        processors?: Record<string, unknown>;
        service?: { pipelines?: Record<string, unknown> };
      };

      // The otelcol input should be excluded from inputs (it is moved to the top-level OTel config)
      expect(body.inputs).to.be.an('array');
      const otelInputs = body.inputs.filter((input) => input.type === 'otelcol');
      expect(otelInputs).to.have.length(0);

      // includes otlp receiver in the OTel config
      const receivers = res.body.receivers as Record<string, unknown>;
      const receiverKeys = Object.keys(receivers);

      // The receiver key is suffixed with the stream id, so just check the prefix
      const hasOtlpReceiver = receiverKeys.some((key) => key.startsWith('otlp/'));
      expect(hasOtlpReceiver).to.be(true);

      // includes a logs pipeline in the OTel service config
      const pipelines = res.body.service?.pipelines as Record<string, unknown>;
      const pipelineKeys = Object.keys(pipelines);

      const hasLogsPipeline = pipelineKeys.some((key) => key.startsWith('logs/'));
      expect(hasLogsPipeline).to.be(true);

      // includes the routing transform processor in the OTel config
      const processors = res.body.processors as Record<string, unknown>;
      const processorKeys = Object.keys(processors);

      const hasRoutingProcessor = processorKeys.some(
        (key) => key.startsWith('transform/') && key.includes('routing')
      );
      expect(hasRoutingProcessor).to.be(true);
    });

    it('generates routing transforms for all signal types when dynamic_signal_types is true', async () => {
      const res = await supertest
        .get(`/api/fleet/epm/templates/${PKG_NAME}/${PKG_VERSION}/inputs?format=json`)
        .expect(200);

      // With dynamic_signal_types: true, the routing transform should contain statements
      // for each signal type present in the pipelines (logs, metrics, traces)
      const processors = res.body.processors as Record<string, Record<string, unknown>>;
      const routingProcessorKey = Object.keys(processors).find(
        (key) => key.startsWith('transform/') && key.includes('routing')
      );
      expect(routingProcessorKey).to.be.ok();

      const routingProcessor = processors[routingProcessorKey!];

      // Each signal type contributes its own statement block
      expect(routingProcessor.log_statements).to.be.ok();
      expect(routingProcessor.metric_statements).to.be.ok();
      expect(routingProcessor.trace_statements).to.be.ok();
    });
  });
}
