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

const PKG_NAME = 'template_paths_test';
const PKG_VERSION = '1.0.0';
const DATA_STREAM_PATH = 'logs';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');

  const testPkgArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/template_paths_test_1.0.0.zip'
  );

  const uninstallPackage = async (name: string, version: string) => {
    await supertest
      .delete(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('Fleet template_paths compilation', () => {
    before(async () => {
      await fleetAndAgents.setup();
      // Respect upload rate limit (10s between uploads) in case other upload tests ran before
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveZip);
      await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);
    });

    after(async () => {
      await uninstallPackage(PKG_NAME, PKG_VERSION);
    });

    async function createAndGetPackagePolicy(vars: { hosts?: string[]; paths?: string[] } = {}) {
      const { hosts = ['localhost'], paths = ['/var/log/test.log'] } = vars;

      const agentPolicyRes = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({ name: `template-paths-test-${Date.now()}`, description: '', namespace: 'default' });
      if (agentPolicyRes.status !== 200 || !agentPolicyRes.body?.item?.id) {
        throw new Error(
          `Failed to create agent policy: ${agentPolicyRes.status} ${JSON.stringify(
            agentPolicyRes.body
          )}`
        );
      }

      const packagePolicyRes = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `template-paths-test-${Date.now()}`,
          description: '',
          namespace: 'default',
          policy_id: agentPolicyRes.body.item.id,
          package: { name: PKG_NAME, version: PKG_VERSION },
          inputs: [
            {
              type: 'log',
              enabled: true,
              streams: [
                {
                  id: 'log-logs',
                  enabled: true,
                  data_stream: {
                    type: 'logs',
                    dataset: `${PKG_NAME}.${DATA_STREAM_PATH}`,
                  },
                  vars: { paths: { value: paths } },
                },
              ],
              vars: { hosts: { value: hosts } },
            },
          ],
        });
      if (packagePolicyRes.status !== 200 || !packagePolicyRes.body?.item?.id) {
        throw new Error(
          `Failed to create package policy: ${packagePolicyRes.status} ${JSON.stringify(
            packagePolicyRes.body
          )}`
        );
      }

      const getRes = await supertest
        .get(`/api/fleet/package_policies/${packagePolicyRes.body.item.id}`)
        .set('kbn-xsrf', 'xxxx');
      if (getRes.status !== 200) {
        throw new Error(
          `Failed to get package policy: ${getRes.status} ${JSON.stringify(getRes.body)}`
        );
      }

      return getRes.body.item;
    }

    it('merges input and stream templates using vars from the policy', async () => {
      const policy = await createAndGetPackagePolicy({
        hosts: ['localhost'],
        paths: ['/var/log/test.log'],
      });

      expect(policy.inputs).to.have.length(1);
      const input = policy.inputs[0];
      expect(input.compiled_input).to.eql({
        hosts: ['localhost', 'remote'],
        timeout: '30s',
      });

      expect(input.streams).to.have.length(1);
      const stream = input.streams[0];
      expect(stream.compiled_stream).to.eql({
        type: 'log',
        metricset: [DATA_STREAM_PATH],
        paths: ['/var/log/test.log'],
        processors: [{ add_host: null }],
        config: { b: 2, c: 3 },
      });
    });
  });
}
