/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import JSZip from 'jszip';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

const STREAM_DATASET = 'unowned_generic';
const STREAM_NAME = `logs-${STREAM_DATASET}-default`;
const STREAM_TEMPLATE = `logs-${STREAM_DATASET}-probe`;
const STREAM_PIPELINE = `logs-${STREAM_DATASET}-probe-pipeline`;
const TAKEOVER_PACKAGE = 'upload_takeover_probe';
const MUTATE_PACKAGE = 'upload_mutate_probe';
const PACKAGE_VERSION = '1.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('Install by upload with ownerless live-stream protection', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    afterEach(async () => {
      await es.indices.deleteDataStream({ name: STREAM_NAME }).catch(() => undefined);
      await es.indices.deleteIndexTemplate({ name: STREAM_TEMPLATE }).catch(() => undefined);
      await es.ingest.deletePipeline({ id: STREAM_PIPELINE }).catch(() => undefined);
      await supertest
        .delete(`/api/fleet/epm/packages/${TAKEOVER_PACKAGE}/${PACKAGE_VERSION}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true });
      await supertest
        .delete(`/api/fleet/epm/packages/${MUTATE_PACKAGE}/${PACKAGE_VERSION}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true });
    });

    it('rejects an upload that claims an ownerless live data stream and leaves the stream assets unchanged', async () => {
      const original = await createOwnerlessLiveStream();
      const buf = await buildUploadPackageZip({
        name: TAKEOVER_PACKAGE,
        dataset: STREAM_DATASET,
      });

      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(400);

      expect(res.body.message).to.contain(STREAM_NAME);
      await expectStreamAssetsUnchanged(original);
    });

    it('rejects a package policy when an uploaded package later targets an ownerless stream through a custom dataset', async () => {
      const original = await createOwnerlessLiveStream();
      const buf = await buildUploadPackageZip({
        name: MUTATE_PACKAGE,
        dataset: `${MUTATE_PACKAGE}.safe`,
        includeDatasetVar: true,
      });

      await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);

      const agentPolicyId = await createAgentPolicy();
      const res = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          force: true,
          create_dataset_templates: true,
          policy_id: agentPolicyId,
          name: 'upload-mutate-probe-policy',
          description: '',
          namespace: 'default',
          enabled: true,
          package: {
            name: MUTATE_PACKAGE,
            version: PACKAGE_VERSION,
          },
          inputs: [
            {
              type: 'logfile',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: `${MUTATE_PACKAGE}.safe` },
                  vars: {
                    'data_stream.dataset': { type: 'text', value: STREAM_DATASET },
                    paths: { type: 'text', value: ['/tmp/upload-mutate-probe.log'] },
                  },
                },
              ],
            },
          ],
        })
        .expect(400);

      expect(res.body.message).to.contain(STREAM_DATASET);
      expect(res.body.message).to.contain('ownership cannot be verified');
      await expectStreamAssetsUnchanged(original);
      const fleetTemplate = await es.indices
        .getIndexTemplate({ name: `logs-${STREAM_DATASET}` })
        .catch((error) => error.meta?.statusCode ?? error.statusCode);
      expect(fleetTemplate).to.be(404);

      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
    });
  });

  async function createOwnerlessLiveStream() {
    await es.ingest.putPipeline({
      id: STREAM_PIPELINE,
      processors: [{ set: { field: 'probe.marker', value: 'original', ignore_failure: true } }],
    });
    await es.indices.putIndexTemplate({
      name: STREAM_TEMPLATE,
      index_patterns: [`logs-${STREAM_DATASET}-*`],
      data_stream: {},
      priority: 500,
      template: {
        settings: {
          index: {
            default_pipeline: STREAM_PIPELINE,
          },
        },
      },
    });
    await es.indices.createDataStream({ name: STREAM_NAME });

    return readStreamAssets();
  }

  async function readStreamAssets() {
    const dataStream = await es.indices.getDataStream({ name: STREAM_NAME });
    const backingIndex = dataStream.data_streams[0].indices[0].index_name;
    const settings = await es.indices.getSettings({ index: backingIndex });
    const indexSettings = settings[backingIndex].settings?.index;

    return {
      template: dataStream.data_streams[0].template,
      defaultPipeline: indexSettings?.default_pipeline,
    };
  }

  async function expectStreamAssetsUnchanged(original: {
    template: string;
    defaultPipeline?: string;
  }) {
    const current = await readStreamAssets();
    expect(current.template).to.be(original.template);
    expect(current.defaultPipeline).to.be(original.defaultPipeline);
  }

  async function createAgentPolicy() {
    const res = await supertest
      .post(`/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name: `Upload mutate probe ${Date.now()}`,
        namespace: 'default',
      })
      .expect(200);
    return res.body.item.id as string;
  }
}

async function buildUploadPackageZip({
  name,
  dataset,
  includeDatasetVar = false,
}: {
  name: string;
  dataset: string;
  includeDatasetVar?: boolean;
}): Promise<Buffer> {
  const root = `${name}-${PACKAGE_VERSION}`;
  const dataStreamDir = `${root}/data_stream/logs`;
  const zip = new JSZip();

  zip.file(
    `${root}/manifest.yml`,
    [
      `name: ${name}`,
      `version: ${PACKAGE_VERSION}`,
      `title: ${name}`,
      'description: Upload live-stream probe package',
      'type: integration',
      'owner:',
      '  github: elastic/fleet',
      'policy_templates:',
      '  - name: logs',
      '    title: Logs',
      '    description: Collect log files',
      '    inputs:',
      '      - type: logfile',
      '        title: Log file',
      '        description: Collect log files',
      '',
    ].join('\n')
  );
  zip.file(
    `${dataStreamDir}/manifest.yml`,
    [
      'title: Probe logs',
      'type: logs',
      `dataset: ${dataset}`,
      'streams:',
      '  - input: logfile',
      '    title: Probe logs',
      '    vars:',
      includeDatasetVar
        ? [
            '      - name: data_stream.dataset',
            '        type: text',
            '        title: Dataset name',
            '        required: false',
            '        show_user: true',
            '      - name: paths',
            '        type: text',
            '        title: Paths',
            '        required: false',
            '        multi: true',
            '        show_user: true',
          ].join('\n')
        : [
            '      - name: paths',
            '        type: text',
            '        title: Paths',
            '        required: false',
            '        multi: true',
            '        show_user: true',
          ].join('\n'),
      '',
    ].join('\n')
  );
  zip.file(
    `${dataStreamDir}/agent/stream/stream.yml.hbs`,
    'paths:\n{{#each paths}}\n  - {{this}}\n{{/each}}\n'
  );

  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
}
