/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CreateAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const createOutput = async ({
    name,
    id,
    type,
    hosts,
  }: {
    name: string;
    id: string;
    type: string;
    hosts: string[];
  }): Promise<string> => {
    const res = await supertest
      .post(`/api/fleet/outputs`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        id,
        name,
        type,
        hosts,
      })
      .expect(200);
    return res.body.item.id;
  };

  const createAgentPolicy = async (
    name: string,
    id: string,
    dataOutputId?: string,
    monitoringOutputId?: string
  ): Promise<CreateAgentPolicyResponse> => {
    const res = await supertest
      .post(`/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name,
        id,
        namespace: 'default',
        ...(dataOutputId ? { data_output_id: dataOutputId } : {}),
        ...(monitoringOutputId ? { monitoring_output_id: monitoringOutputId } : {}),
      })
      .expect(200);
    return res.body.item;
  };

  const createAgentPolicyWithPackagePolicy = async ({
    name,
    id,
    outputId,
  }: {
    name: string;
    id: string;
    outputId?: string;
  }): Promise<CreateAgentPolicyResponse> => {
    const { body: res } = await supertest
      .post(`/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name,
        namespace: 'default',
        id,
      })
      .expect(200);

    const agentPolicyWithPPId = res.item.id;
    // package policy needs to have a custom output_id
    await supertest
      .post(`/api/fleet/package_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name: 'filetest-1',
        description: '',
        namespace: 'default',
        ...(outputId ? { output_id: outputId } : {}),
        policy_id: agentPolicyWithPPId,
        inputs: [],
        package: {
          name: 'filetest',
          title: 'For File Tests',
          version: '0.1.0',
        },
      })
      .expect(200);
    return res.item;
  };

  let output1Id = '';
  describe('fleet_agent_policies_outputs', () => {
    describe('POST /api/fleet/agent_policies/outputs', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();

        output1Id = await createOutput({
          name: 'Output 1',
          id: 'logstash-output-1',
          type: 'logstash',
          hosts: ['test.fr:443'],
        });
      });
      after(async () => {
        await supertest
          .delete(`/api/fleet/outputs/${output1Id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('should get a list of outputs by agent policies', async () => {
        await createAgentPolicy('Agent policy with default output', 'agent-policy-1');
        await createAgentPolicy(
          'Agent policy with custom output',
          'agent-policy-2',
          output1Id,
          output1Id
        );

        const outputsPerPoliciesRes = await supertest
          .post(`/api/fleet/agent_policies/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: ['agent-policy-1', 'agent-policy-2'],
          })
          .expect(200);
        expect(outputsPerPoliciesRes.body.items).to.eql([
          {
            agentPolicyId: 'agent-policy-1',
            monitoring: {
              output: {
                name: 'default',
                id: 'fleet-default-output',
              },
            },
            data: {
              output: {
                name: 'default',
                id: 'fleet-default-output',
              },
              integrations: [],
            },
          },
          {
            agentPolicyId: 'agent-policy-2',
            monitoring: {
              output: {
                name: 'Output 1',
                id: 'logstash-output-1',
              },
            },
            data: {
              output: {
                name: 'Output 1',
                id: 'logstash-output-1',
              },
              integrations: [],
            },
          },
        ]);
        // clean up policies
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .send({ agentPolicyId: 'agent-policy-1' })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .send({ agentPolicyId: 'agent-policy-2' })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });
    });

    let output2Id = '';
    describe('GET /api/fleet/agent_policies/{agentPolicyId}/outputs', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();

        output2Id = await createOutput({
          name: 'ES Output 1',
          id: 'es-output-1',
          type: 'elasticsearch',
          hosts: ['https://test.fr:8080'],
        });
      });
      after(async () => {
        await supertest
          .delete(`/api/fleet/outputs/${output2Id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('should get the list of outputs related to an agentPolicy id', async () => {
        await createAgentPolicy('Agent policy with ES output', 'agent-policy-custom', output2Id);

        const outputsPerPoliciesRes = await supertest
          .get(`/api/fleet/agent_policies/agent-policy-custom/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        expect(outputsPerPoliciesRes.body.item).to.eql({
          monitoring: {
            output: {
              name: 'default',
              id: 'fleet-default-output',
            },
          },
          data: {
            output: {
              name: 'ES Output 1',
              id: 'es-output-1',
            },
            integrations: [],
          },
        });

        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .send({ agentPolicyId: 'agent-policy-custom' })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('should also list the outputs set on integrations if any', async () => {
        await createAgentPolicyWithPackagePolicy({
          name: 'Agent Policy with package policy',
          id: 'agent-policy-custom-2',
          outputId: output2Id,
        });

        const outputsPerPoliciesRes = await supertest
          .get(`/api/fleet/agent_policies/agent-policy-custom-2/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        expect(outputsPerPoliciesRes.body.item).to.eql({
          monitoring: {
            output: {
              name: 'default',
              id: 'fleet-default-output',
            },
          },
          data: {
            output: {
              name: 'default',
              id: 'fleet-default-output',
            },
            integrations: [
              {
                id: 'es-output-1',
                integrationPolicyName: 'filetest-1',
                name: 'ES Output 1',
              },
            ],
          },
        });

        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .send({ agentPolicyId: 'agent-policy-custom-2' })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });
    });
  });
}
