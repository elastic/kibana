/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { skipIfNoDockerRegistry } from '../../helpers';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { createTestSpace } from '../space_awareness/helpers';
import { setupTestUsers, testUsers } from '../test_users';

const OLD_ARN = 'arn:aws:iam::123456789012:role/Old';
const NEW_ARN = 'arn:aws:iam::123456789012:role/New';
const EXTERNAL_ID_SECRET = {
  type: 'password',
  value: { id: 'EXTERNALID1234567890', isSecretRef: true },
} as const;

const PKG = { name: 'cloud_connector_test_aws', version: '0.1.0' };
const INPUT_TYPE = 'aws/metrics';
const POLICY_TEMPLATE = 'aws';
const DATASET = 'cloud_connector_test_aws.metrics';

const OTHER_SPACE = 'cc-role-arn-shared';
const SPACES = ['default', OTHER_SPACE] as const;

const spacePath = (spaceId: string) => (spaceId === 'default' ? '' : `/s/${spaceId}`);

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');

  describe('cloud_connector role_arn edit on a connector shared across spaces', () => {
    skipIfNoDockerRegistry(providerContext);

    let connectorId: string;
    const packagePolicyIdBySpace: Record<string, string> = {};

    const putRoleArn = (user: { username: string; password: string }, roleArn: string) =>
      supertestWithoutAuth
        .put(`/api/fleet/cloud_connectors/${connectorId}`)
        .auth(user.username, user.password)
        .set('kbn-xsrf', 'xxxx')
        .send({
          vars: { role_arn: { type: 'text', value: roleArn }, external_id: EXTERNAL_ID_SECRET },
        });

    const expectRoleArnInEverySpace = async (expectedArn: string) => {
      for (const spaceId of SPACES) {
        const { body } = await supertest
          .get(
            `${spacePath(spaceId)}/api/fleet/package_policies/${packagePolicyIdBySpace[spaceId]}`
          )
          .expect(200);
        expect(body.item.vars.role_arn.value).to.eql(expectedArn);
        for (const input of body.item.inputs) {
          expect(input.vars.role_arn.value).to.eql(expectedArn);
          for (const stream of input.streams) {
            expect(stream.vars.role_arn.value).to.eql(expectedArn);
          }
        }
      }
    };

    const expectConnectorRoleArn = async (expectedArn: string) => {
      const { body } = await supertest
        .get(`/api/fleet/cloud_connectors/${connectorId}`)
        .expect(200);
      expect(body.item.vars.role_arn.value).to.eql(expectedArn);
    };

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await setupTestUsers(getService('security'), true);

      await supertest
        .post('/internal/fleet/enable_space_awareness')
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '1')
        .expect(200);
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'xxxx').expect(200);
      await createTestSpace(providerContext, OTHER_SPACE);
      await kibanaServer.savedObjects.cleanStandardList({ space: OTHER_SPACE });

      await supertest
        .post(`/api/fleet/epm/packages/${PKG.name}/${PKG.version}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      const { body: connector } = await supertest
        .post('/api/fleet/cloud_connectors')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `edit_role_arn shared spaces E2E ${Date.now()}`,
          cloudProvider: 'aws',
          vars: { role_arn: { type: 'text', value: OLD_ARN }, external_id: EXTERNAL_ID_SECRET },
        })
        .expect(200);
      connectorId = connector.item.id;

      await supertest
        .post('/api/spaces/_update_objects_spaces')
        .set('kbn-xsrf', 'xxxx')
        .send({
          objects: [{ type: 'fleet-cloud-connector', id: connectorId }],
          spacesToAdd: [OTHER_SPACE],
          spacesToRemove: [],
        })
        .expect(200);

      for (const spaceId of SPACES) {
        const { body: agentPolicy } = await supertest
          .post(`${spacePath(spaceId)}/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Shared connector agent policy ${spaceId} ${Date.now()}`,
            namespace: 'default',
            monitoring_enabled: [],
          })
          .expect(200);

        const { body: packagePolicy } = await supertest
          .post(`${spacePath(spaceId)}/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `role-arn-shared-${spaceId}`,
            namespace: 'default',
            policy_ids: [agentPolicy.item.id],
            package: PKG,
            cloud_connector_id: connectorId,
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
        packagePolicyIdBySpace[spaceId] = packagePolicy.item.id;
      }
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({ space: OTHER_SPACE });
      await spaces.delete(OTHER_SPACE);
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    it('refuses the change for a user who can write integration policies in only one of the spaces', async () => {
      await expectRoleArnInEverySpace(OLD_ARN);

      await putRoleArn(testUsers.fleet_all_int_all_default_space_only, NEW_ARN).expect(403);

      await expectConnectorRoleArn(OLD_ARN);
      await expectRoleArnInEverySpace(OLD_ARN);
    });

    it('fans the change out to the policies in every space for a user with access to all of them', async () => {
      await putRoleArn(testUsers.fleet_all_int_all, NEW_ARN).expect(200);

      await expectConnectorRoleArn(NEW_ARN);
      await expectRoleArnInEverySpace(NEW_ARN);
    });
  });
}
