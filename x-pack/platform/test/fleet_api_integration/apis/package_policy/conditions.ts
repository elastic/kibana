/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { cleanFleetIndices } from '../space_awareness/helpers';

const PKG_NAME = 'with_required_variables';
const PKG_VERSION = '0.1.0';
const INPUT_TYPE = 'test_input';
const DATASET = 'with_required_variables.log';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es: Client = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const createAgentPolicy = async (overrides: Record<string, unknown> = {}): Promise<string> => {
    const { body } = await supertest
      .post('/api/fleet/agent_policies')
      .set('kbn-xsrf', 'xxxx')
      .send({ name: `conditions-${uuidv4()}`, namespace: 'default', ...overrides })
      .expect(200);
    return body.item.id;
  };

  const deleteAgentPolicy = async (agentPolicyId: string) => {
    await supertest
      .post('/api/fleet/agent_policies/delete')
      .set('kbn-xsrf', 'xxxx')
      .send({ agentPolicyId });
  };

  const createPackagePolicy = async (body: Record<string, unknown>, expected = 200) => {
    const res = await supertest
      .post('/api/fleet/package_policies')
      .set('kbn-xsrf', 'xxxx')
      .send(body)
      .expect(expected);
    return res.body;
  };

  const getPackagePolicy = async (id: string) => {
    const { body } = await supertest.get(`/api/fleet/package_policies/${id}`).expect(200);
    return body.item;
  };

  const getFullAgentPolicy = async (id: string) => {
    const { body } = await supertest.get(`/api/fleet/agent_policies/${id}/full`).expect(200);
    return body.item;
  };

  const makeStream = (extras: Record<string, unknown> = {}) => ({
    enabled: true,
    data_stream: { dataset: DATASET, type: 'logs' },
    vars: { test_var_required: { value: 'required' } },
    ...extras,
  });

  describe('Package Policy - conditions', () => {
    skipIfNoDockerRegistry(providerContext);
    let agentPolicyId: string;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
      await fleetAndAgents.setup();
      agentPolicyId = await createAgentPolicy();
    });

    after(async () => {
      if (agentPolicyId) await deleteAgentPolicy(agentPolicyId);
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
    });

    it('persists condition fields at integration, input, and stream levels', async () => {
      const integrationCondition = "${host.platform} == 'linux'";
      const inputCondition = "${host.platform} != 'windows'";
      const streamCondition = "${host.name} == 'mybox'";
      const created = await createPackagePolicy({
        name: `cond-persists-${uuidv4()}`,
        namespace: 'default',
        policy_id: agentPolicyId,
        condition: integrationCondition,
        inputs: [
          {
            type: INPUT_TYPE,
            enabled: true,
            condition: inputCondition,
            streams: [makeStream({ condition: streamCondition })],
          },
        ],
        package: { name: PKG_NAME, version: PKG_VERSION },
      });
      const id = created.item.id;

      const fetched = await getPackagePolicy(id);
      expect(fetched.condition).to.eql(integrationCondition);
      expect(fetched.inputs[0].condition).to.eql(inputCondition);
      expect(fetched.inputs[0].streams[0].condition).to.eql(streamCondition);
    });

    it('reflects updates to condition fields on subsequent GET', async () => {
      const created = await createPackagePolicy({
        name: `cond-updates-${uuidv4()}`,
        namespace: 'default',
        policy_id: agentPolicyId,
        condition: "${host.platform} == 'linux'",
        inputs: [
          {
            type: INPUT_TYPE,
            enabled: true,
            streams: [makeStream({ condition: "${host.name} == 'mybox'" })],
          },
        ],
        package: { name: PKG_NAME, version: PKG_VERSION },
      });
      const id = created.item.id;

      await supertest
        .put(`/api/fleet/package_policies/${id}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: created.item.name,
          namespace: 'default',
          policy_id: agentPolicyId,
          condition: "${host.platform} == 'darwin'",
          inputs: [
            {
              type: INPUT_TYPE,
              enabled: true,
              streams: [makeStream({ condition: "${host.name} == 'macbook'" })],
            },
          ],
          package: { name: PKG_NAME, version: PKG_VERSION },
        })
        .expect(200);

      const fetched = await getPackagePolicy(id);
      expect(fetched.condition).to.eql("${host.platform} == 'darwin'");
      expect(fetched.inputs[0].streams[0].condition).to.eql("${host.name} == 'macbook'");
    });

    it('fans out integration-level condition to inputs in the full agent policy', async () => {
      const integrationCondition = "${host.platform} == 'linux'";
      const inputCondition = "${host.platform} != 'windows'";
      const streamCondition = "${host.name} == 'mybox'";

      await createPackagePolicy({
        name: `cond-full-${uuidv4()}`,
        namespace: 'default',
        policy_id: agentPolicyId,
        condition: integrationCondition,
        inputs: [
          {
            type: INPUT_TYPE,
            enabled: true,
            condition: inputCondition,
            streams: [makeStream({ condition: streamCondition })],
          },
        ],
        package: { name: PKG_NAME, version: PKG_VERSION },
      });

      const fullPolicy = await getFullAgentPolicy(agentPolicyId);
      const input = fullPolicy.inputs.find((i: { type: string }) => i.type === INPUT_TYPE);
      expect(input).to.be.ok();
      // Integration- and input-level conditions AND-combine at the input; no template condition for this package.
      expect(input.condition).to.eql(`(${integrationCondition}) and (${inputCondition})`);
      // Stream-level condition emits as-is when there is no template stream condition.
      expect(input.streams[0].condition).to.eql(streamCondition);
    });

    it('rejects any condition on agentless package policies (400)', async () => {
      const { body } = await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `cond-agentless-${uuidv4()}`,
          namespace: 'default',
          policy_id: agentPolicyId,
          supports_agentless: true,
          condition: "${host.platform} == 'linux'",
          inputs: [
            {
              type: INPUT_TYPE,
              enabled: true,
              streams: [makeStream()],
            },
          ],
          package: { name: PKG_NAME, version: PKG_VERSION },
        })
        .expect(400);
      expect(body.message).to.match(/agentless/i);
    });

    it('rejects condition on otelcol-type inputs (400)', async () => {
      const { body } = await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `cond-otelcol-${uuidv4()}`,
          namespace: 'default',
          policy_id: agentPolicyId,
          inputs: [
            {
              type: 'otelcol',
              enabled: true,
              condition: "${host.platform} == 'linux'",
              streams: [makeStream()],
            },
          ],
          package: { name: PKG_NAME, version: PKG_VERSION },
        })
        .expect(400);
      expect(body.message).to.match(/otelcol/i);
    });

    it('overrides.inputs[id].condition wins in the full agent policy', async () => {
      const tempAgentPolicyId = await createAgentPolicy();
      try {
        const created = await createPackagePolicy({
          name: `cond-override-${uuidv4()}`,
          namespace: 'default',
          policy_id: tempAgentPolicyId,
          condition: "${host.platform} == 'linux'",
          inputs: [
            {
              type: INPUT_TYPE,
              enabled: true,
              condition: "${host.platform} != 'windows'",
              streams: [makeStream()],
            },
          ],
          package: { name: PKG_NAME, version: PKG_VERSION },
        });
        const id = created.item.id;
        const inputId = created.item.inputs[0].id;

        await supertest
          .put(`/api/fleet/package_policies/${id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: created.item.name,
            namespace: 'default',
            policy_id: tempAgentPolicyId,
            condition: "${host.platform} == 'linux'",
            overrides: { inputs: { [inputId]: { condition: "${host.platform} == 'darwin'" } } },
            inputs: [
              {
                type: INPUT_TYPE,
                enabled: true,
                condition: "${host.platform} != 'windows'",
                streams: [makeStream()],
              },
            ],
            package: { name: PKG_NAME, version: PKG_VERSION },
          })
          .expect(200);

        const fullPolicy = await getFullAgentPolicy(tempAgentPolicyId);
        const input = fullPolicy.inputs.find((i: { id: string }) => i.id === inputId);
        expect(input).to.be.ok();
        expect(input.condition).to.eql("${host.platform} == 'darwin'");
      } finally {
        await deleteAgentPolicy(tempAgentPolicyId);
      }
    });

    describe('simplified package policy format', () => {
      const SIMPLIFIED_INPUT_ID = `${PKG_NAME}-${INPUT_TYPE}`;

      it('persists condition fields at integration, input, and stream levels', async () => {
        const integrationCondition = "${host.platform} == 'linux'";
        const inputCondition = "${host.platform} != 'windows'";
        const streamCondition = "${host.name} == 'mybox'";
        const created = await createPackagePolicy({
          name: `cond-simplified-persists-${uuidv4()}`,
          namespace: 'default',
          policy_id: agentPolicyId,
          condition: integrationCondition,
          inputs: {
            [SIMPLIFIED_INPUT_ID]: {
              enabled: true,
              condition: inputCondition,
              streams: {
                [DATASET]: {
                  enabled: true,
                  condition: streamCondition,
                  vars: { test_var_required: 'required' },
                },
              },
            },
          },
          package: { name: PKG_NAME, version: PKG_VERSION },
        });
        const id = created.item.id;

        const fetched = await getPackagePolicy(id);
        expect(fetched.condition).to.eql(integrationCondition);
        expect(fetched.inputs[0].condition).to.eql(inputCondition);
        expect(fetched.inputs[0].streams[0].condition).to.eql(streamCondition);
      });

      it('reflects updates to condition fields on subsequent GET', async () => {
        const created = await createPackagePolicy({
          name: `cond-simplified-updates-${uuidv4()}`,
          namespace: 'default',
          policy_id: agentPolicyId,
          condition: "${host.platform} == 'linux'",
          inputs: {
            [SIMPLIFIED_INPUT_ID]: {
              enabled: true,
              streams: {
                [DATASET]: {
                  enabled: true,
                  condition: "${host.name} == 'mybox'",
                  vars: { test_var_required: 'required' },
                },
              },
            },
          },
          package: { name: PKG_NAME, version: PKG_VERSION },
        });
        const id = created.item.id;

        await supertest
          .put(`/api/fleet/package_policies/${id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: created.item.name,
            namespace: 'default',
            policy_id: agentPolicyId,
            condition: "${host.platform} == 'darwin'",
            inputs: {
              [SIMPLIFIED_INPUT_ID]: {
                enabled: true,
                streams: {
                  [DATASET]: {
                    enabled: true,
                    condition: "${host.name} == 'macbook'",
                    vars: { test_var_required: 'required' },
                  },
                },
              },
            },
            package: { name: PKG_NAME, version: PKG_VERSION },
          })
          .expect(200);

        const fetched = await getPackagePolicy(id);
        expect(fetched.condition).to.eql("${host.platform} == 'darwin'");
        expect(fetched.inputs[0].streams[0].condition).to.eql("${host.name} == 'macbook'");
      });

      it('rejects any condition on agentless package policies (400)', async () => {
        const { body } = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `cond-simplified-agentless-${uuidv4()}`,
            namespace: 'default',
            policy_id: agentPolicyId,
            supports_agentless: true,
            condition: "${host.platform} == 'linux'",
            inputs: {
              [SIMPLIFIED_INPUT_ID]: {
                enabled: true,
                streams: {
                  [DATASET]: {
                    enabled: true,
                    vars: { test_var_required: 'required' },
                  },
                },
              },
            },
            package: { name: PKG_NAME, version: PKG_VERSION },
          })
          .expect(400);
        expect(body.message).to.match(/agentless/i);
      });

      it('fans out integration-level condition to inputs in the full agent policy', async () => {
        const tempAgentPolicyId = await createAgentPolicy();
        try {
          const integrationCondition = "${host.platform} == 'linux'";
          const inputCondition = "${host.platform} != 'windows'";
          const streamCondition = "${host.name} == 'mybox'";

          await createPackagePolicy({
            name: `cond-simplified-full-${uuidv4()}`,
            namespace: 'default',
            policy_id: tempAgentPolicyId,
            condition: integrationCondition,
            inputs: {
              [SIMPLIFIED_INPUT_ID]: {
                enabled: true,
                condition: inputCondition,
                streams: {
                  [DATASET]: {
                    enabled: true,
                    condition: streamCondition,
                    vars: { test_var_required: 'required' },
                  },
                },
              },
            },
            package: { name: PKG_NAME, version: PKG_VERSION },
          });

          const fullPolicy = await getFullAgentPolicy(tempAgentPolicyId);
          const input = fullPolicy.inputs.find((i: { type: string }) => i.type === INPUT_TYPE);
          expect(input).to.be.ok();
          // Integration- and input-level conditions AND-combine at the input; no template condition for this package.
          expect(input.condition).to.eql(`(${integrationCondition}) and (${inputCondition})`);
          // Stream-level condition emits as-is when there is no template stream condition.
          expect(input.streams[0].condition).to.eql(streamCondition);
        } finally {
          await deleteAgentPolicy(tempAgentPolicyId);
        }
      });
    });
  });
}
