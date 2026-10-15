/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { INTERNAL_ROUTE_HEADERS } from './helpers/fixtures';

const CALLBACKS_PATH = '/internal/fleet/iac_provisioner/callbacks';
const receivePath = (id: string) => `/api/fleet/iac_provisioner/callbacks/${id}`;
const PUBLIC_ROUTE_HEADERS = { 'kbn-xsrf': 'xxxx', 'elastic-api-version': '2023-10-31' };

const ACCOUNT = '123456789012';
const PAYLOAD = {
  role_arn: `arn:aws:iam::${ACCOUNT}:role/ElasticWorkloadIdentity-abc`,
  stack_arn: `arn:aws:cloudformation:us-east-1:${ACCOUNT}:stack/elastic-wif/11111111-2222-3333-4444-555555555555`,
};

/**
 * The receive route is what the launched stack's Lambda calls. It is public and only accepts
 * the API key created for the record.
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
    return body as { item: { id: string; status: string; expires_at: string }; api_key: string };
  };

  const receive = (id: string, apiKey: string, payload: Record<string, unknown> = PAYLOAD) =>
    supertestWithoutAuth
      .post(receivePath(id))
      .set(PUBLIC_ROUTE_HEADERS)
      .set('Authorization', `ApiKey ${apiKey}`)
      .send(payload);

  describe('IaC callbacks', () => {
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

    it('creates a pending record and returns the key exactly once', async () => {
      const { item, api_key: apiKey } = await createCallback();

      expect(item.status).to.be('pending');
      expect(item).to.not.have.property('api_key_id');
      expect(apiKey).to.be.a('string');
      // Base64 `id:api_key`, as the Lambda sends it in `Authorization: ApiKey`.
      expect(Buffer.from(apiKey, 'base64').toString()).to.match(/^.+:.+$/);

      const { body } = await supertest
        .get(`${CALLBACKS_PATH}/${item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      expect(body.item.status).to.be('pending');
      expect(JSON.stringify(body)).to.not.contain(apiKey);
    });

    it('receives the values with the bound key, replays idempotently and rejects a different payload', async () => {
      const { item, api_key: apiKey } = await createCallback();

      const first = await receive(item.id, apiKey).expect(200);
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

      // The first receive invalidated the key, so Kibana now rejects it.
      await receive(item.id, apiKey).expect(401);
    });

    it('rejects a key issued for another record without revealing the record', async () => {
      const first = await createCallback();
      const second = await createCallback();

      await receive(first.item.id, second.api_key).expect(404);

      const { body } = await supertest
        .get(`${CALLBACKS_PATH}/${first.item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      expect(body.item.status).to.be('pending');
    });

    it('rejects a role and a stack from different accounts', async () => {
      const { item, api_key: apiKey } = await createCallback();

      await receive(item.id, apiKey, {
        ...PAYLOAD,
        role_arn: 'arn:aws:iam::999999999999:role/other',
      }).expect(400);
    });

    it('rejects malformed values', async () => {
      const { item, api_key: apiKey } = await createCallback();

      await receive(item.id, apiKey, { ...PAYLOAD, stack_arn: 'not-an-arn' }).expect(400);
      await receive(item.id, apiKey, { ...PAYLOAD, role_arn: 'not-an-arn' }).expect(400);
    });

    it('answers 404 to a caller that did not authenticate with an API key', async () => {
      const { item } = await createCallback();

      // Basic auth is accepted by Kibana but is not the record's key.
      await supertest
        .post(receivePath(item.id))
        .set(PUBLIC_ROUTE_HEADERS)
        .send(PAYLOAD)
        .expect(404);
    });

    it('creates the identity with the name, account type and template details sent at create', async () => {
      const { item, api_key: apiKey } = await createCallback({
        connector_name: 'iac-callback-named',
        account_type: 'single-account',
        iac_key: 'sha256:abc',
        iac_blueprint_id: 'federated-identity',
        iac_blueprint_version: '1.0.0',
      });
      const stackArn = `arn:aws:cloudformation:us-east-1:${ACCOUNT}:stack/elastic-wif/66666666-7777-8888-9999-000000000000`;

      await receive(item.id, apiKey, { ...PAYLOAD, stack_arn: stackArn }).expect(200);

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
      expect(created.name).to.be('iac-callback-named');
      expect(created.accountType).to.be('single-account');
      expect(created.iac_key).to.be('sha256:abc');
      expect(created.iac_blueprint_id).to.be('federated-identity');
      expect(created.iac_blueprint_version).to.be('1.0.0');
      expect(created.iac_deployment_id).to.be(stackArn);
    });

    it('cancels a pending record, so a late report is turned away', async () => {
      const { item, api_key: apiKey } = await createCallback();

      const { body } = await supertest
        .delete(`${CALLBACKS_PATH}/${item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      expect(body.item.status).to.be('cancelled');
      expect(body.item).to.not.have.property('api_key_id');

      // The cancel invalidated the key, so the stack can no longer report.
      await receive(item.id, apiKey).expect(401);

      const connectors = await supertest
        .get('/api/fleet/cloud_connectors')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      expect(connectors.body.items.find((c: { id: string }) => c.id === item.id)).to.be(undefined);
    });

    it('hands back the received record when cancelled after the stack reported', async () => {
      const { item, api_key: apiKey } = await createCallback({ connector_name: 'cancel-late' });
      const stackArn = `arn:aws:cloudformation:us-east-1:${ACCOUNT}:stack/elastic-wif/77777777-8888-9999-0000-111111111111`;
      await receive(item.id, apiKey, { ...PAYLOAD, stack_arn: stackArn }).expect(200);

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
  });
}
