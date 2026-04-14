/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fleet API tests for data_stream.dataset on input (logfile) packages in the full agent policy.
 * Parity with elastic/package-spec compliance for dataset defaults and overrides (PR #1136).
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

const PKG_NAME = 'integration_to_input';
const PKG_VERSION = '2.0.0';

function getDatasetVarValue(vars: Record<string, any> | undefined): string {
  const raw = vars?.['data_stream.dataset']?.value;
  if (raw == null) {
    return '';
  }
  if (typeof raw === 'string') {
    return raw;
  }
  if (typeof raw === 'object' && raw.dataset != null) {
    return String(raw.dataset);
  }
  return String(raw);
}

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('Input logfile package data_stream.dataset in full agent policy', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    async function createAgentPolicy(): Promise<string> {
      const {
        body: {
          item: { id },
        },
      } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({ name: `input-dataset-test-${uuidv4()}`, namespace: 'default' })
        .expect(200);
      return id;
    }

    async function deleteAgentPolicy(agentPolicyId: string) {
      await supertest
        .post('/api/fleet/agent_policies/delete')
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
    }

    async function getFullAgentPolicy(agentPolicyId: string): Promise<Record<string, any>> {
      const { body } = await supertest
        .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      return body.item;
    }

    it('exposes default data_stream.dataset on compiled logfile streams (from package policy vars)', async () => {
      const agentPolicyId = await createAgentPolicy();

      try {
        const {
          body: {
            item: { id: packagePolicyId },
          },
        } = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `input-dataset-default-${uuidv4()}`,
            namespace: 'default',
            policy_id: agentPolicyId,
            package: { name: PKG_NAME, version: PKG_VERSION },
            inputs: {
              'logs-logfile': {
                enabled: true,
                streams: {
                  'integration_to_input.logs': {
                    enabled: true,
                    vars: {
                      paths: ['/tmp/test.log'],
                      tags: ['tag1'],
                      ignore_older: '72h',
                    },
                  },
                },
              },
            },
          })
          .expect(200);

        const { body: pkgPolicyBody } = await supertest
          .get(`/api/fleet/package_policies/${packagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const logfileInput = pkgPolicyBody.item.inputs.find(
          (i: { type: string }) => i.type === 'logfile'
        );
        expect(logfileInput).to.be.ok();
        const stream = logfileInput.streams[0];
        const expectedDataset = getDatasetVarValue(stream.vars);

        expect(expectedDataset.length).to.be.greaterThan(0);

        const fullPolicy = await getFullAgentPolicy(agentPolicyId);
        const fullLogfileInput = fullPolicy.inputs.find(
          (i: { type: string; package_policy_id: string }) =>
            i.type === 'logfile' && i.package_policy_id === packagePolicyId
        );
        expect(fullLogfileInput).to.be.ok();
        expect(fullLogfileInput.streams.length).to.be.greaterThan(0);
        expect(fullLogfileInput.streams[0].data_stream.dataset).to.eql(expectedDataset);
      } finally {
        await deleteAgentPolicy(agentPolicyId);
      }
    });

    it('applies data_stream.dataset override to compiled logfile streams in the full agent policy', async () => {
      const agentPolicyId = await createAgentPolicy();
      const overrideDataset = 'custom.input_test';

      try {
        const {
          body: {
            item: { id: packagePolicyId },
          },
        } = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `input-dataset-override-${uuidv4()}`,
            namespace: 'default',
            policy_id: agentPolicyId,
            package: { name: PKG_NAME, version: PKG_VERSION },
            inputs: {
              'logs-logfile': {
                enabled: true,
                streams: {
                  'integration_to_input.logs': {
                    enabled: true,
                    vars: {
                      paths: ['/tmp/test.log'],
                      tags: ['tag1'],
                      ignore_older: '72h',
                      'data_stream.dataset': overrideDataset,
                    },
                  },
                },
              },
            },
          })
          .expect(200);

        const { body: pkgPolicyBody } = await supertest
          .get(`/api/fleet/package_policies/${packagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const logfileInput = pkgPolicyBody.item.inputs.find(
          (i: { type: string }) => i.type === 'logfile'
        );
        expect(getDatasetVarValue(logfileInput.streams[0].vars)).to.eql(overrideDataset);

        const fullPolicy = await getFullAgentPolicy(agentPolicyId);
        const fullLogfileInput = fullPolicy.inputs.find(
          (i: { type: string; package_policy_id: string }) =>
            i.type === 'logfile' && i.package_policy_id === packagePolicyId
        );
        expect(fullLogfileInput.streams[0].data_stream.dataset).to.eql(overrideDataset);
      } finally {
        await deleteAgentPolicy(agentPolicyId);
      }
    });
  });
}
