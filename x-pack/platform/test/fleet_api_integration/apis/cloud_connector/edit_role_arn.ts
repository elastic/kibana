/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { skipIfNoDockerRegistry } from '../../helpers';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const OLD_ARN = 'arn:aws:iam::123456789012:role/Old';
const NEW_ARN = 'arn:aws:iam::123456789012:role/New';
/** Fleet secret reference ids are 20 characters; the connector stores the reference, not the value. */
const EXTERNAL_ID_SECRET = {
  type: 'password',
  value: { id: 'EXTERNALID1234567890', isSecretRef: true },
} as const;

/**
 * Test fixture package mounted into the FTR package registry from
 * `apis/fixtures/test_packages/cloud_connector_test_aws`. It declares a `role_arn` variable on the
 * `aws/metrics` input and on its single stream, which is exactly what the fan-out rewrites.
 */
const PKG = { name: 'cloud_connector_test_aws', version: '0.1.0' };
const INPUT_TYPE = 'aws/metrics';
const POLICY_TEMPLATE = 'aws';
const DATASET = 'cloud_connector_test_aws.metrics';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('cloud_connector role_arn edit', () => {
    skipIfNoDockerRegistry(providerContext);

    let connectorId: string;
    let agentPolicyId: string;
    const packagePolicyIds: string[] = [];

    const getAgentPolicyRevision = async (): Promise<number> => {
      const { body } = await supertest
        .get(`/api/fleet/agent_policies/${agentPolicyId}`)
        .expect(200);
      return body.item.revision;
    };

    const expectRoleArnEverywhere = async (expectedArn: string) => {
      for (const id of packagePolicyIds) {
        const { body } = await supertest.get(`/api/fleet/package_policies/${id}`).expect(200);
        // The real `aws` integration keeps `role_arn` as a top-level shared package var — the
        // fan-out has to rewrite this or every AWS-integration policy goes stale. Guard for it.
        expect(body.item.vars.role_arn.value).to.eql(expectedArn);
        for (const input of body.item.inputs) {
          expect(input.vars.role_arn.value).to.eql(expectedArn);
          for (const stream of input.streams) {
            expect(stream.vars.role_arn.value).to.eql(expectedArn);
          }
        }
      }
    };

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();

      await supertest
        .post(`/api/fleet/epm/packages/${PKG.name}/${PKG.version}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      const { body: connector } = await supertest
        .post('/api/fleet/cloud_connectors')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `edit_role_arn E2E ${Date.now()}`,
          cloudProvider: 'aws',
          vars: {
            role_arn: { type: 'text', value: OLD_ARN },
            external_id: EXTERNAL_ID_SECRET,
          },
        })
        .expect(200);
      connectorId = connector.item.id;

      const { body: agentPolicy } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Fan-out agent policy ${Date.now()}`,
          namespace: 'default',
          monitoring_enabled: [],
        })
        .expect(200);
      agentPolicyId = agentPolicy.item.id;

      for (let index = 0; index < 2; index++) {
        const { body: packagePolicy } = await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `role-arn-test-${index}`,
            namespace: 'default',
            policy_ids: [agentPolicyId],
            package: PKG,
            // Only the full-form body accepts cloud_connector_id; the simplified form rejects it.
            cloud_connector_id: connectorId,
            // Top-level `vars.role_arn` mirrors the real `aws` integration's shared-var shape;
            // input/stream `vars.role_arn` mirrors CSPM/Asset-Discovery. Cover both.
            vars: { role_arn: { type: 'text', value: OLD_ARN } },
            inputs: [
              {
                type: INPUT_TYPE,
                policy_template: POLICY_TEMPLATE,
                enabled: true,
                vars: { role_arn: { type: 'text', value: OLD_ARN } },
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'metrics', dataset: DATASET },
                    vars: { role_arn: { type: 'text', value: OLD_ARN } },
                  },
                ],
              },
            ],
          })
          .expect(200);
        packagePolicyIds.push(packagePolicy.item.id);
      }
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    it('fans out a valid ARN change to every referencing policy and bumps the agent policy revision', async () => {
      await expectRoleArnEverywhere(OLD_ARN);
      const revisionBefore = await getAgentPolicyRevision();

      await supertest
        .put(`/api/fleet/cloud_connectors/${connectorId}`)
        .set('kbn-xsrf', 'xxxx')
        // The browser merges the edited ARN into the stored vars because PUT replaces `vars`
        // wholesale; sending role_arn alone would drop the external_id secret reference.
        .send({
          vars: { role_arn: { type: 'text', value: NEW_ARN }, external_id: EXTERNAL_ID_SECRET },
        })
        .expect(200);

      await expectRoleArnEverywhere(NEW_ARN);
      expect(await getAgentPolicyRevision()).to.be.greaterThan(revisionBefore);

      const { body: connector } = await supertest
        .get(`/api/fleet/cloud_connectors/${connectorId}`)
        .expect(200);
      expect(connector.item.vars.role_arn.value).to.eql(NEW_ARN);
      expect(connector.item.vars.external_id).to.eql(EXTERNAL_ID_SECRET);
      expect(connector.item.verification_status).to.eql('pending');
    });

    it('is a no-op when the ARN is unchanged', async () => {
      const revisionBefore = await getAgentPolicyRevision();

      await supertest
        .put(`/api/fleet/cloud_connectors/${connectorId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          vars: { role_arn: { type: 'text', value: NEW_ARN }, external_id: EXTERNAL_ID_SECRET },
        })
        .expect(200);

      expect(await getAgentPolicyRevision()).to.eql(revisionBefore);
      await expectRoleArnEverywhere(NEW_ARN);
    });

    it('keeps external_id when a role-only retry does not change the ARN', async () => {
      await supertest
        .put(`/api/fleet/cloud_connectors/${connectorId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          vars: { role_arn: { type: 'text', value: NEW_ARN } },
        })
        .expect(200);

      const { body: connector } = await supertest
        .get(`/api/fleet/cloud_connectors/${connectorId}`)
        .expect(200);
      expect(connector.item.vars.role_arn.value).to.eql(NEW_ARN);
      expect(connector.item.vars.external_id).to.eql(EXTERNAL_ID_SECRET);
      await expectRoleArnEverywhere(NEW_ARN);
    });

    it('rejects an invalid ARN with 400 and leaves every policy untouched', async () => {
      const revisionBefore = await getAgentPolicyRevision();

      await supertest
        .put(`/api/fleet/cloud_connectors/${connectorId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          vars: {
            role_arn: { type: 'text', value: 'not-an-arn' },
            external_id: EXTERNAL_ID_SECRET,
          },
        })
        .expect(400);

      expect(await getAgentPolicyRevision()).to.eql(revisionBefore);
      await expectRoleArnEverywhere(NEW_ARN);
    });
  });
}
