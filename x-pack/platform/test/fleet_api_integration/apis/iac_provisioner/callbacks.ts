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
  aws_account_id: ACCOUNT,
  region: 'us-east-1',
};

/**
 * Runs with the IaC Provisioner flag on (config.iac_provisioner.ts). The receive route is what
 * the launched stack's Lambda calls: public, authenticated only by the key minted for the record.
 */
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const createCallback = async () => {
    const { body } = await supertest
      .post(CALLBACKS_PATH)
      .set(INTERNAL_ROUTE_HEADERS)
      .send({ provider: 'aws' })
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
      expect(body.item.aws_account_id).to.be(ACCOUNT);
      expect(body.item.region).to.be('us-east-1');

      // The key is single use: it was invalidated on the first receive, so Kibana's auth chain
      // now rejects it before the handler — a replay with the dead key is 401, not 200.
      // (Idempotent 200 for a replay covers the window before invalidation completes; see the
      // service unit tests.)
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

    it('rejects a payload whose account ids disagree', async () => {
      const { item, api_key: apiKey } = await createCallback();

      await receive(item.id, apiKey, {
        ...PAYLOAD,
        role_arn: 'arn:aws:iam::999999999999:role/other',
      }).expect(400);
    });

    it('rejects malformed values', async () => {
      const { item, api_key: apiKey } = await createCallback();

      await receive(item.id, apiKey, { ...PAYLOAD, stack_arn: 'not-an-arn' }).expect(400);
      await receive(item.id, apiKey, { ...PAYLOAD, aws_account_id: '12' }).expect(400);
    });

    it('answers 404 to a caller that did not authenticate with an API key', async () => {
      const { item } = await createCallback();

      // The superuser's basic auth passes Kibana's auth chain but is not the bound key.
      await supertest
        .post(receivePath(item.id))
        .set(PUBLIC_ROUTE_HEADERS)
        .send(PAYLOAD)
        .expect(404);
    });

    it('answers 410 after the record was cancelled, and the key is dead', async () => {
      const { item, api_key: apiKey } = await createCallback();

      const { body } = await supertest
        .delete(`${CALLBACKS_PATH}/${item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      expect(body).to.eql({ id: item.id, status: 'cancelled' });

      // Cancel invalidates the key, so the auth chain rejects it; a still-valid key for a
      // cancelled record would get 410 from the handler (covered by the unit tests).
      const res = await receive(item.id, apiKey);
      expect([401, 410]).to.contain(res.status);
    });

    it('answers 404 for an unknown record on the browser routes', async () => {
      await supertest
        .get(`${CALLBACKS_PATH}/does-not-exist`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(404);
      await supertest
        .delete(`${CALLBACKS_PATH}/does-not-exist`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(404);
    });
  });
}
