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
const SIMPLIFIED_INPUT_ID = `${PKG_NAME}-${INPUT_TYPE}`;

// Above the 10,000 character cap that 9.5 briefly applied to simplified variable values
const LARGE_VALUE_LENGTH = 26500;
const LARGER_VALUE_LENGTH = 30000;

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es: Client = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const createAgentPolicy = async (): Promise<string> => {
    const { body } = await supertest
      .post('/api/fleet/agent_policies')
      .set('kbn-xsrf', 'xxxx')
      .send({ name: `variable-values-${uuidv4()}`, namespace: 'default' })
      .expect(200);
    return body.item.id;
  };

  const deleteAgentPolicy = async (agentPolicyId: string) => {
    await supertest
      .post('/api/fleet/agent_policies/delete')
      .set('kbn-xsrf', 'xxxx')
      .send({ agentPolicyId });
  };

  const getPackagePolicy = async (id: string) => {
    const { body } = await supertest.get(`/api/fleet/package_policies/${id}`).expect(200);
    return body.item;
  };

  const simplifiedBody = (agentPolicyId: string, name: string, value: string) => ({
    name,
    namespace: 'default',
    policy_id: agentPolicyId,
    inputs: {
      [SIMPLIFIED_INPUT_ID]: {
        enabled: true,
        streams: { [DATASET]: { enabled: true, vars: { test_var_required: value } } },
      },
    },
    package: { name: PKG_NAME, version: PKG_VERSION },
  });

  describe('Package Policy - large variable values', () => {
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

    describe('simplified package policy format', () => {
      it('creates a policy with a string variable value over 10,000 characters', async () => {
        const value = 'a'.repeat(LARGE_VALUE_LENGTH);
        const { body } = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send(simplifiedBody(agentPolicyId, `large-var-create-${uuidv4()}`, value))
          .expect(200);

        const fetched = await getPackagePolicy(body.item.id);
        expect(fetched.inputs[0].streams[0].vars.test_var_required.value).to.eql(value);
      });

      it('updates a policy with a string variable value over 10,000 characters', async () => {
        const { body } = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send(simplifiedBody(agentPolicyId, `large-var-update-${uuidv4()}`, 'small'))
          .expect(200);
        const id = body.item.id;

        const value = 'b'.repeat(LARGER_VALUE_LENGTH);
        await supertest
          .put(`/api/fleet/package_policies/${id}`)
          .set('kbn-xsrf', 'xxxx')
          .send(simplifiedBody(agentPolicyId, body.item.name, value))
          .expect(200);

        const fetched = await getPackagePolicy(id);
        expect(fetched.inputs[0].streams[0].vars.test_var_required.value).to.eql(value);
      });

      it('can still read and rename a policy that holds a value over 10,000 characters', async () => {
        const value = 'c'.repeat(LARGE_VALUE_LENGTH);
        const { body } = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send(simplifiedBody(agentPolicyId, `large-var-rename-${uuidv4()}`, value))
          .expect(200);
        const id = body.item.id;

        await supertest
          .put(`/api/fleet/package_policies/${id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: `large-var-renamed-${uuidv4()}` })
          .expect(200);

        const fetched = await getPackagePolicy(id);
        expect(fetched.inputs[0].streams[0].vars.test_var_required.value).to.eql(value);
      });
    });

    describe('legacy package policy format', () => {
      it('still accepts a string variable value over 10,000 characters', async () => {
        const value = 'd'.repeat(LARGE_VALUE_LENGTH);
        const { body } = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `large-var-legacy-${uuidv4()}`,
            namespace: 'default',
            policy_id: agentPolicyId,
            inputs: [
              {
                type: INPUT_TYPE,
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: { dataset: DATASET, type: 'logs' },
                    vars: { test_var_required: { value } },
                  },
                ],
              },
            ],
            package: { name: PKG_NAME, version: PKG_VERSION },
          })
          .expect(200);

        const fetched = await getPackagePolicy(body.item.id);
        expect(fetched.inputs[0].streams[0].vars.test_var_required.value).to.eql(value);
      });
    });
  });
}
