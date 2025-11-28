/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { CreateAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import { GLOBAL_SETTINGS_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common/constants';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');
  const es = getService('es');

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
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
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
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
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

    describe('GET /api/fleet/agent_policies/{agentPolicyId}/full with encrypted outputs', () => {
      const getSecretById = (id: string) => {
        return es.get({
          index: '.fleet-secrets',
          id,
        });
      };

      const enableOutputSecrets = async () => {
        try {
          await kibanaServer.savedObjects.create({
            type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
            id: 'fleet-default-settings',
            attributes: {
              output_secret_storage_requirements_met: true,
              use_space_awareness_migration_status: 'success',
            },
            overwrite: true,
          });
        } catch (e) {
          throw e;
        }
      };

      const disableOutputSecrets = async () => {
        try {
          await kibanaServer.savedObjects.create({
            type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
            id: 'fleet-default-settings',
            attributes: {
              output_secret_storage_requirements_met: false,
              use_space_awareness_migration_status: 'success',
            },
            overwrite: true,
          });
        } catch (e) {
          throw e;
        }
      };

      let dataOutputId = '';
      let monitoringOutputId = '';
      let agentPolicyId = '';

      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();
        await enableOutputSecrets();

        // Create data output with encrypted SSL fields
        const dataOutputRes = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Data Output With Secrets',
            id: 'data-output-with-secrets',
            type: 'elasticsearch',
            hosts: ['https://data-output.fr:9200'],
            ssl: {
              certificate: 'DATA_CERTIFICATE',
              certificate_authorities: ['DATA_CA1', 'DATA_CA2'],
            },
            secrets: {
              ssl: {
                key: 'DATA_SECRET_KEY',
              },
            },
          })
          .expect(200);
        dataOutputId = dataOutputRes.body.item.id;

        // Create monitoring output with encrypted SSL fields
        const monitoringOutputRes = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Monitoring Output With Secrets',
            id: 'monitoring-output-with-secrets',
            type: 'elasticsearch',
            hosts: ['https://monitoring-output.fr:9200'],
            ssl: {
              certificate: 'MONITORING_CERTIFICATE',
              certificate_authorities: ['MONITORING_CA1'],
            },
            secrets: {
              ssl: {
                key: 'MONITORING_SECRET_KEY',
              },
            },
          })
          .expect(200);
        monitoringOutputId = monitoringOutputRes.body.item.id;

        // Create agent policy using these outputs
        const agentPolicyRes = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Agent Policy With Encrypted Outputs',
            id: 'agent-policy-encrypted-outputs',
            namespace: 'default',
            data_output_id: dataOutputId,
            monitoring_output_id: monitoringOutputId,
          })
          .expect(200);
        agentPolicyId = agentPolicyRes.body.item.id;
      });

      after(async () => {
        if (agentPolicyId) {
          await supertest
            .post(`/api/fleet/agent_policies/delete`)
            .send({ agentPolicyId })
            .set('kbn-xsrf', 'xxxx')
            .expect(200);
        }
        if (dataOutputId) {
          await supertest
            .delete(`/api/fleet/outputs/${dataOutputId}`)
            .set('kbn-xsrf', 'xxxx')
            .expect(200);
        }
        if (monitoringOutputId) {
          await supertest
            .delete(`/api/fleet/outputs/${monitoringOutputId}`)
            .set('kbn-xsrf', 'xxxx')
            .expect(200);
        }
        await disableOutputSecrets();
      });

      it('should correctly retrieve encrypted fields for outputs', async () => {
        // Get full agent policy - this uses fetchRelatedSavedObjects which calls outputService.bulkGet
        const fullPolicyRes = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const fullPolicy = fullPolicyRes.body.item;

        // Verify outputs are present in the response
        expect(Object.keys(fullPolicy.outputs).length).to.be.greaterThan(0);

        // Find the data and monitoring outputs in the response
        const dataOutput = fullPolicy.outputs[dataOutputId] as
          | {
              ssl?: {
                certificate?: string;
                certificate_authorities?: string[];
                key?: string;
              };
            }
          | undefined;
        const monitoringOutput = fullPolicy.outputs[monitoringOutputId] as
          | {
              ssl?: {
                certificate?: string;
                certificate_authorities?: string[];
                key?: string;
              };
            }
          | undefined;

        // Verify that SSL fields are present and decrypted
        expect(dataOutput!.ssl!.certificate).to.equal('DATA_CERTIFICATE');
        expect(dataOutput!.ssl!.certificate_authorities).to.eql(['DATA_CA1', 'DATA_CA2']);

        expect(monitoringOutput!.ssl!.certificate).to.equal('MONITORING_CERTIFICATE');
        expect(monitoringOutput!.ssl!.certificate_authorities).to.eql(['MONITORING_CA1']);

        // Verify that secrets are stored as references
        const dataOutputGetRes = await supertest
          .get(`/api/fleet/outputs/${dataOutputId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const monitoringOutputGetRes = await supertest
          .get(`/api/fleet/outputs/${monitoringOutputId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const dataOutputDetails = dataOutputGetRes.body.item;
        const monitoringOutputDetails = monitoringOutputGetRes.body.item;

        expect(dataOutputDetails.secrets.ssl.key.id).to.be.a('string');
        expect(monitoringOutputDetails.secrets.ssl.key.id).to.be.a('string');

        const dataSecret = await getSecretById(dataOutputDetails.secrets.ssl.key.id);
        // @ts-ignore _source unknown type
        expect(dataSecret._source.value).to.equal('DATA_SECRET_KEY');

        const monitoringSecret = await getSecretById(monitoringOutputDetails.secrets.ssl.key.id);
        // @ts-ignore _source unknown type
        expect(monitoringSecret._source.value).to.equal('MONITORING_SECRET_KEY');
      });
    });
  });
}
