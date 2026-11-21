/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import expect from '@kbn/expect';
import {
  PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
  PROVISIONING_CALLBACK_TOKEN_HEADER,
} from '@kbn/fleet-plugin/common/constants';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { INTERNAL_ROUTE_HEADERS } from './helpers/fixtures';
import {
  callerIdentityResponse,
  createMockSts,
  signatureRejectedResponse,
} from './helpers/mock_sts';

const CALLBACKS_PATH = '/internal/fleet/iac_provisioner/callbacks';
const receivePath = (id: string) => `/api/fleet/iac_provisioner/callbacks/${id}`;
const PUBLIC_ROUTE_HEADERS = { 'kbn-xsrf': 'xxxx', 'elastic-api-version': '2023-10-31' };

const ACCOUNT = '123456789012';
const STACK_NAME = 'elastic-wif';
const PAYLOAD = {
  role_arn: `arn:aws:iam::${ACCOUNT}:role/ElasticWorkloadIdentity-abc`,
  stack_arn: `arn:aws:cloudformation:us-east-1:${ACCOUNT}:stack/${STACK_NAME}/11111111-2222-3333-4444-555555555555`,
};
const OTHER_ROLE_ARN = `arn:aws:iam::${ACCOUNT}:role/ElasticWorkloadIdentity-other`;
/** The principal of the stack's callback Lambda, as STS names it. */
const CALLBACK_FUNCTION_ARN = `arn:aws:sts::${ACCOUNT}:assumed-role/${STACK_NAME}-ElasticCallbackFunctionRole-1A2B3C4D5E6F/${STACK_NAME}-ElasticCallbackFunction-A1B2C3D4E5F6`;
const STS_BODY = 'Action=GetCallerIdentity&Version=2011-06-15';
const SIGNED_HEADERS =
  'content-type;host;x-amz-date;x-amz-security-token;x-elastic-callback-id;x-elastic-report-sha256';

interface Values {
  role_arn: string;
  stack_arn: string;
}

/** The digest the Lambda signs: the values with sorted keys and no whitespace. */
const digestOf = ({ role_arn: roleArn, stack_arn: stackArn }: Values) =>
  createHash('sha256')
    .update(JSON.stringify({ role_arn: roleArn, stack_arn: stackArn }))
    .digest('hex');

/**
 * The proof as the Lambda attaches it: a SigV4-signed STS request whose signed headers carry the
 * callback id and the digest of the values. The mock STS does not check the signature, so a
 * well-formed `Authorization` header stands in for a real one.
 */
const proofFor = (
  callbackId: string,
  values: Values,
  overrides: { region?: string; headers?: Record<string, string>; body?: string } = {}
) => ({
  region: overrides.region ?? 'us-east-1',
  headers: {
    Authorization: `AWS4-HMAC-SHA256 Credential=ASIAEXAMPLE/20261113/${
      overrides.region ?? 'us-east-1'
    }/sts/aws4_request, SignedHeaders=${SIGNED_HEADERS}, Signature=${'ab'.repeat(32)}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Amz-Date': '20261113T100000Z',
    'X-Amz-Security-Token': 'IQoJb3JpZ2luX2VjEXAMPLE',
    'x-elastic-callback-id': callbackId,
    'x-elastic-report-sha256': digestOf(values),
    ...overrides.headers,
  },
  body: overrides.body ?? STS_BODY,
});

/** A report of `values` for `callbackId`, with a proof bound to both. */
const reportFor = (callbackId: string, values: Values = PAYLOAD) => ({
  ...values,
  caller_identity: proofFor(callbackId, values),
});

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
  // Vouches, by default, for the callback function of the stack in PAYLOAD.
  const sts = createMockSts(() => callerIdentityResponse(ACCOUNT, CALLBACK_FUNCTION_ARN));

  const createCallback = async (identity: Record<string, unknown> = {}) => {
    const { body } = await supertest
      .post(CALLBACKS_PATH)
      .set(INTERNAL_ROUTE_HEADERS)
      .send({ provider: 'aws', ...identity })
      .expect(200);
    return body as { item: { id: string; status: string; expires_at: string }; token: string };
  };

  // The route is not authenticated: the record's token, in a header, is all the stack presents.
  // The report carries the proof of its account for the values it reports.
  const receive = (id: string, token: string, values: Values = PAYLOAD) =>
    receiveRaw(id, token, reportFor(id, values));
  const receiveRaw = (id: string, token: string, body: Record<string, unknown>) =>
    supertestWithoutAuth
      .post(receivePath(id))
      .set(PUBLIC_ROUTE_HEADERS)
      .set(PROVISIONING_CALLBACK_TOKEN_HEADER, token)
      .send(body);

  const getRecord = async (id: string) => {
    const { body } = await supertest
      .get(`${CALLBACKS_PATH}/${id}`)
      .set(INTERNAL_ROUTE_HEADERS)
      .expect(200);
    return body.item as { status: string; cloud_connector_id?: string };
  };

  describe('Provisioning callbacks', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
      await sts.start();
    });

    after(async () => {
      await sts.stop();
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    beforeEach(() => {
      sts.reset();
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

      // The proof went to STS as signed: only the signed headers, and the fixed body.
      const forwarded = sts.getRequests();
      expect(forwarded).to.have.length(1);
      expect(forwarded[0].body).to.be(STS_BODY);
      expect(forwarded[0].headers['x-elastic-callback-id']).to.be(item.id);
      expect(forwarded[0].headers['x-elastic-report-sha256']).to.be(digestOf(PAYLOAD));
      expect(forwarded[0].headers['x-amz-security-token']).to.be('IQoJb3JpZ2luX2VjEXAMPLE');
      expect(forwarded[0].headers.authorization).to.contain('AWS4-HMAC-SHA256');
      expect(forwarded[0].headers['x-elastic-callback-token']).to.be(undefined);

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
      expect(sts.getRequests()).to.have.length(0);
    });

    it('rejects malformed values', async () => {
      const { item, token } = await createCallback();

      await receive(item.id, token, { ...PAYLOAD, stack_arn: 'not-an-arn' }).expect(400);
      await receive(item.id, token, { ...PAYLOAD, role_arn: 'not-an-arn' }).expect(400);
    });

    it('rejects a report without the proof of its account', async () => {
      const { item, token } = await createCallback();

      await receiveRaw(item.id, token, PAYLOAD).expect(400);
      await receiveRaw(item.id, token, {
        ...PAYLOAD,
        caller_identity: { ...proofFor(item.id, PAYLOAD), region: 'sts.evil.example' },
      }).expect(400);
      expect(sts.getRequests()).to.have.length(0);
      expect((await getRecord(item.id)).status).to.be('pending');
    });

    it('rejects with 401 a report signed from another account than the reported role, and keeps the record for a report that verifies', async () => {
      const { item, token } = await createCallback();
      const other = '999999999999';
      sts.setResponder(() =>
        callerIdentityResponse(other, CALLBACK_FUNCTION_ARN.replace(ACCOUNT, other))
      );

      const rejected = await receive(item.id, token).expect(401);
      expect(rejected.body.message).to.be(
        'The report was not signed from the AWS account of the reported role'
      );
      expect((await getRecord(item.id)).status).to.be('pending');
      const connectors = await supertest
        .get('/api/fleet/cloud_connectors')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      expect(connectors.body.items.find((c: { id: string }) => c.id === item.id)).to.be(undefined);

      sts.reset();
      await receive(item.id, token).expect(200);
      expect((await getRecord(item.id)).status).to.be('received');
    });

    it('rejects with 401 a report whose signer is in the account but is not the stack callback function', async () => {
      const { item, token } = await createCallback();
      sts.setResponder(() =>
        callerIdentityResponse(ACCOUNT, `arn:aws:sts::${ACCOUNT}:assumed-role/Admin/alice`)
      );

      await receive(item.id, token).expect(401);
      expect((await getRecord(item.id)).status).to.be('pending');
    });

    it('rejects with 401 when STS refuses the signature', async () => {
      const { item, token } = await createCallback();
      sts.setResponder(() => signatureRejectedResponse());

      await receive(item.id, token).expect(401);
      expect((await getRecord(item.id)).status).to.be('pending');
    });

    it('rejects with 401, without contacting STS, a proof made for another callback', async () => {
      const first = await createCallback();
      const second = await createCallback();

      // A proof captured from the second record's report, replayed against the first.
      await receiveRaw(first.item.id, first.token, reportFor(second.item.id)).expect(401);
      expect(sts.getRequests()).to.have.length(0);
      expect((await getRecord(first.item.id)).status).to.be('pending');
    });

    it('rejects with 401, without contacting STS, a proof made for other values', async () => {
      const { item, token } = await createCallback();

      // The proof signs the digest of PAYLOAD, but another role is reported.
      await receiveRaw(item.id, token, {
        ...PAYLOAD,
        role_arn: OTHER_ROLE_ARN,
        caller_identity: proofFor(item.id, PAYLOAD),
      }).expect(401);
      expect(sts.getRequests()).to.have.length(0);
      expect((await getRecord(item.id)).status).to.be('pending');
    });

    it('rejects with 401 a proof that did not sign the binding headers', async () => {
      const { item, token } = await createCallback();

      await receiveRaw(item.id, token, {
        ...PAYLOAD,
        caller_identity: proofFor(item.id, PAYLOAD, {
          headers: {
            Authorization: `AWS4-HMAC-SHA256 Credential=ASIAEXAMPLE/20261113/us-east-1/sts/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=${'ab'.repeat(
              32
            )}`,
          },
        }),
      }).expect(401);
      expect(sts.getRequests()).to.have.length(0);
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

    it('cannot be read or written through the generic saved objects APIs', async () => {
      // A record written there could name any space and carry the hash of a token of the
      // author's choosing, which the unauthenticated receive route would honour. Only the Fleet
      // routes may make or change one.
      const { item } = await createCallback();
      const type = PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE;
      const forged = {
        provider: 'aws',
        status: 'pending',
        token_hash: 'a'.repeat(64),
        created_at: new Date().toISOString(),
        space_id: 'another-space',
        expires_at: item.expires_at,
      };
      const expectUnsupported = ({ body }: { body: { message: string } }) =>
        expect(body.message).to.contain('Unsupported saved object type');

      expectUnsupported(
        await supertest
          .post(`/api/saved_objects/${type}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ attributes: forged })
          .expect(400)
      );
      expectUnsupported(
        await supertest
          .post('/api/saved_objects/_bulk_create')
          .set('kbn-xsrf', 'xxxx')
          .send([{ type, attributes: forged }])
          .expect(400)
      );
      expectUnsupported(
        await supertest
          .put(`/api/saved_objects/${type}/${item.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ attributes: { space_id: 'another-space' } })
          .expect(400)
      );
      expectUnsupported(
        await supertest
          .put('/api/saved_objects/_bulk_update')
          .set('kbn-xsrf', 'xxxx')
          .send([{ type, id: item.id, attributes: { space_id: 'another-space' } }])
          .expect(400)
      );
      expectUnsupported(await supertest.get(`/api/saved_objects/${type}/${item.id}`).expect(400));
      expectUnsupported(
        await supertest.get('/api/saved_objects/_find').query({ type }).expect(400)
      );

      // The Fleet route still reads it.
      const { body } = await supertest
        .get(`${CALLBACKS_PATH}/${item.id}`)
        .set(INTERNAL_ROUTE_HEADERS)
        .expect(200);
      expect(body.item.status).to.be('pending');
    });
  });
}
