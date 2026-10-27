/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import {
  CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES,
  PROVISIONING_CALLBACK_TOKEN_HEADER,
} from '@kbn/fleet-plugin/common/constants';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupMockServer } from '../agents/helpers/mock_agentless_api';
import { INTERNAL_ROUTE_HEADERS } from './helpers/fixtures';

const CALLBACKS_PATH = '/internal/fleet/iac_provisioner/callbacks';
const receivePath = (id: string) => `/api/fleet/iac_provisioner/callbacks/${id}`;
const PUBLIC_ROUTE_HEADERS = { 'kbn-xsrf': 'xxxx', 'elastic-api-version': '2023-10-31' };

const ACCOUNT = '123456789012';
const PAYLOAD = {
  role_arn: `arn:aws:iam::${ACCOUNT}:role/ElasticWorkloadIdentity-abc`,
  stack_arn: `arn:aws:cloudformation:us-east-1:${ACCOUNT}:stack/elastic-wif/11111111-2222-3333-4444-555555555555`,
};
const OTHER_ROLE_ARN = `arn:aws:iam::${ACCOUNT}:role/ElasticWorkloadIdentity-other`;

/**
 * The receive route is what the launched stack's Lambda calls. It is public, not authenticated,
 * and only accepts the token minted for the record.
 */
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const createCallback = async (identity: Record<string, unknown> = {}) => {
    const { body } = await supertest
      .post(CALLBACKS_PATH)
      .set(INTERNAL_ROUTE_HEADERS)
      .send({ provider: 'aws', ...identity })
      .expect(200);
    return body as { item: { id: string; status: string; expires_at: string }; token: string };
  };

  // The route is not authenticated: the record's token, in a header, is all the stack presents.
  const receive = (id: string, token: string, payload: Record<string, unknown> = PAYLOAD) =>
    supertestWithoutAuth
      .post(receivePath(id))
      .set(PUBLIC_ROUTE_HEADERS)
      .set(PROVISIONING_CALLBACK_TOKEN_HEADER, token)
      .send(payload);

  describe('Provisioning callbacks', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    it('creates a pending record and returns the token exactly once', async () => {
      const { item, token } = await createCallback();

      expect(item.status).to.be('pending');
      expect(item).to.not.have.property('token_hash');
      // 256 random bits as hex, as the Lambda sends them in the token header.
      expect(token).to.match(/^[0-9a-f]{64}$/);

      const { body } = await supertest
        .get(`${CALLBACKS_PATH}/${item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      expect(body.item.status).to.be('pending');
      expect(JSON.stringify(body)).to.not.contain(token);
    });

    it('receives the values with the bound token, replays idempotently and rejects a different payload', async () => {
      const { item, token } = await createCallback();

      const first = await receive(item.id, token).expect(200);
      expect(first.body).to.eql({ status: 'received' });

      const { body } = await supertest
        .get(`${CALLBACKS_PATH}/${item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      expect(body.item.status).to.be('received');
      expect(body.item.role_arn).to.be(PAYLOAD.role_arn);
      expect(body.item.stack_arn).to.be(PAYLOAD.stack_arn);
      expect(body.item.cloud_connector_id).to.be.a('string');

      const connectors = await supertest
        .get('/api/fleet/cloud_connectors')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      const created = connectors.body.items.find(
        (connector: { id: string }) => connector.id === body.item.cloud_connector_id
      );
      expect(created.vars.role_arn.value).to.be(PAYLOAD.role_arn);
      expect(created.iac_deployment_id).to.be(PAYLOAD.stack_arn);
      expect(created.name).to.be('ElasticWorkloadIdentity-abc');

      // The token has nothing left to do: a retry of the same report, as the Lambda sends on a
      // retry, gets the same answer and creates nothing, and different values are refused.
      const again = await receive(item.id, token).expect(200);
      expect(again.body).to.eql({ status: 'received' });
      await receive(item.id, token, { ...PAYLOAD, role_arn: OTHER_ROLE_ARN }).expect(409);
      const after = await supertest
        .get('/api/fleet/cloud_connectors')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      expect(
        after.body.items.filter((connector: { id: string }) => connector.id === item.id)
      ).to.have.length(1);
    });

    it('rejects a token issued for another record without revealing the record', async () => {
      const first = await createCallback();
      const second = await createCallback();

      await receive(first.item.id, second.token).expect(404);

      const { body } = await supertest
        .get(`${CALLBACKS_PATH}/${first.item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      expect(body.item.status).to.be('pending');
    });

    it('rejects a role and a stack from different accounts', async () => {
      const { item, token } = await createCallback();

      await receive(item.id, token, {
        ...PAYLOAD,
        role_arn: 'arn:aws:iam::999999999999:role/other',
      }).expect(400);
    });

    it('rejects malformed values', async () => {
      const { item, token } = await createCallback();

      await receive(item.id, token, { ...PAYLOAD, stack_arn: 'not-an-arn' }).expect(400);
      await receive(item.id, token, { ...PAYLOAD, role_arn: 'not-an-arn' }).expect(400);
    });

    it('answers 404 to a caller that presents no token, whatever else it authenticates with', async () => {
      const { item } = await createCallback();

      // Kibana credentials are not the record's token.
      await supertest
        .post(receivePath(item.id))
        .set(PUBLIC_ROUTE_HEADERS)
        .send(PAYLOAD)
        .expect(404);
    });

    it('answers 404 to a malformed token', async () => {
      const { item } = await createCallback();

      await receive(item.id, 'not-a-token').expect(404);
    });

    it('creates the identity with the name, account type and template details sent at create', async () => {
      const { item, token } = await createCallback({
        connector_name: 'provisioning-callback-named',
        account_type: 'single-account',
        iac_key: 'sha256:abc',
        iac_blueprint_id: 'federated-identity',
        iac_blueprint_version: '1.0.0',
      });
      const stackArn = `arn:aws:cloudformation:us-east-1:${ACCOUNT}:stack/elastic-wif/66666666-7777-8888-9999-000000000000`;

      await receive(item.id, token, { ...PAYLOAD, stack_arn: stackArn }).expect(200);

      const { body } = await supertest
        .get(`${CALLBACKS_PATH}/${item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      const connectors = await supertest
        .get('/api/fleet/cloud_connectors')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      const created = connectors.body.items.find(
        (connector: { id: string }) => connector.id === body.item.cloud_connector_id
      );
      expect(created.name).to.be('provisioning-callback-named');
      expect(created.accountType).to.be('single-account');
      expect(created.iac_key).to.be('sha256:abc');
      expect(created.iac_blueprint_id).to.be('federated-identity');
      expect(created.iac_blueprint_version).to.be('1.0.0');
      expect(created.iac_deployment_id).to.be(stackArn);
    });

    it('cancels a pending record, so a late report is turned away', async () => {
      const { item, token } = await createCallback();

      const { body } = await supertest
        .delete(`${CALLBACKS_PATH}/${item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      expect(body.item.status).to.be('cancelled');
      expect(body.item).to.not.have.property('token_hash');

      // The record is cancelled, so its own token is turned away.
      await receive(item.id, token).expect(410);

      const connectors = await supertest
        .get('/api/fleet/cloud_connectors')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      expect(connectors.body.items.find((c: { id: string }) => c.id === item.id)).to.be(undefined);
    });

    it('hands back the received record when cancelled after the stack reported', async () => {
      const { item, token } = await createCallback({ connector_name: 'cancel-late' });
      const stackArn = `arn:aws:cloudformation:us-east-1:${ACCOUNT}:stack/elastic-wif/77777777-8888-9999-0000-111111111111`;
      await receive(item.id, token, { ...PAYLOAD, stack_arn: stackArn }).expect(200);

      const { body } = await supertest
        .delete(`${CALLBACKS_PATH}/${item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      expect(body.item.status).to.be('received');
      // The connector takes the record's id, so a retry of the report can never make a second one.
      expect(body.item.cloud_connector_id).to.be(item.id);
    });

    it('answers 404 when cancelling an unknown record', async () => {
      await supertest
        .delete(`${CALLBACKS_PATH}/does-not-exist`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(404);
    });

    it('rejects an unknown create field', async () => {
      await supertest
        .post(CALLBACKS_PATH)
        .set(INTERNAL_ROUTE_HEADERS)
        .send({ provider: 'aws', role_arn: PAYLOAD.role_arn })
        .expect(400);
    });

    it('answers 404 for an unknown record', async () => {
      await supertest
        .get(`${CALLBACKS_PATH}/does-not-exist`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(404);
    });

    describe('automatic deploy', () => {
      let mockAgentlessApi: http.Server;

      before(async () => {
        // Creating an agentless policy talks to the agentless API; the base config points it at
        // this port.
        mockAgentlessApi = await setupMockServer().listen(8089);
      });

      after(async () => {
        await mockAgentlessApi.close();
      });

      const waitForDeployStage = async (callbackId: string) => {
        for (let attempt = 0; attempt < 90; attempt++) {
          const { body } = await supertest
            .get(`${CALLBACKS_PATH}/${callbackId}`)
            .set(INTERNAL_ROUTE_HEADERS)
            .expect(200);
          if (body.item.deploy_status === 'deployed' || body.item.deploy_status === 'failed') {
            return body.item as {
              deploy_status: string;
              deploy_error?: string;
              cloud_connector_id: string;
            };
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        throw new Error('The deploy stage did not finish in time');
      };

      it('deploys the stored agentless policies once the stack reports back', async () => {
        const policyId = uuidv4();
        const { body: deployment } = await supertest
          .post(CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.CREATE_PATTERN)
          .set(PUBLIC_ROUTE_HEADERS)
          .send({
            provider: 'aws',
            mechanisms: ['managed_integration'],
            services: ['sample'],
            authMethod: 'identity_federation',
            pendingAgentlessPolicies: [
              {
                id: policyId,
                instanceIds: ['sample'],
                request: {
                  name: `auto-deploy-${Date.now()}`,
                  namespace: 'default',
                  package: { name: 'test_agentless', version: '1.0.0' },
                  inputs: {
                    'sample-httpjson': {
                      enabled: true,
                      vars: { api_key: 'TEST_VALUE_API_KEY' },
                      streams: {},
                    },
                  },
                },
              },
            ],
          })
          .expect(200);
        expect(deployment.item.status).to.be('pending');
        expect(deployment.item).to.not.have.property('pendingAgentlessPolicies');

        const { item, token } = await createCallback({
          connector_name: 'auto-deploy',
          onboarding_deployment_id: deployment.item.id,
        });
        await receive(item.id, token).expect(200);

        const record = await waitForDeployStage(item.id);
        expect(record.deploy_error).to.be(undefined);
        expect(record.deploy_status).to.be('deployed');

        const { body: policy } = await supertest
          .get(`/api/fleet/agentless_policies/${policyId}`)
          .set(PUBLIC_ROUTE_HEADERS)
          .expect(200);
        expect(policy.item.id).to.be(policyId);
        // The package policy behind it authenticates through the identity the stack created.
        const { body: packagePolicy } = await supertest
          .get(`/api/fleet/package_policies/${policyId}`)
          .set(PUBLIC_ROUTE_HEADERS)
          .expect(200);
        expect(packagePolicy.item.cloud_connector_id).to.be(record.cloud_connector_id);
        expect(packagePolicy.item.created_by).to.be('elastic');

        const { body: finished } = await supertest
          .get(
            CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.INFO_PATTERN.replace('{id}', deployment.item.id)
          )
          .set(PUBLIC_ROUTE_HEADERS)
          .expect(200);
        expect(finished.item.status).to.be('succeeded');
        expect(finished.item.connectorId).to.be(record.cloud_connector_id);
        expect(finished.item.packagePolicyIds).to.eql([policyId]);
        expect(finished.item.policyIdsByInstance).to.eql({ sample: policyId });

        await supertest
          .delete(`/api/fleet/agentless_policies/${policyId}`)
          .set(PUBLIC_ROUTE_HEADERS)
          .expect(200);
      });
    });
  });
}
