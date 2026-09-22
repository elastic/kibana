/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MAX_IAC_RENDER_INTEGRATIONS } from '@kbn/fleet-plugin/common/types/rest_spec/iac_provisioner';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import {
  ADDED_PACKAGE_INTEGRATION,
  INTERNAL_ROUTE_HEADERS,
  STORED_IAC_KEY,
  TEST_PACKAGE_INTEGRATION_SET,
  TEST_PACKAGE_PROVISIONER_INTEGRATIONS,
  attachTestPackagePolicy,
  createAgentPolicy,
  createAwsCloudConnector,
  createAzureCloudConnector,
  getCloudConnector,
  integrationsOverCap,
  verifyIacKeyPath,
} from './helpers/fixtures';
import {
  IAC_PROVISIONER_RENDER_PATH,
  createMockIacProvisioner,
  renderResponse,
} from './helpers/mock_iac_provisioner_api';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const mockIacProvisioner = createMockIacProvisioner();

  const verify = (cloudConnectorId: string, body: Record<string, unknown> = {}) =>
    supertest.post(verifyIacKeyPath(cloudConnectorId)).set(INTERNAL_ROUTE_HEADERS).send(body);

  describe('POST /internal/fleet/cloud_connectors/{id}/verify_iac_key', () => {
    skipIfNoDockerRegistry(providerContext);

    let agentPolicyId: string;

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
      await mockIacProvisioner.start();
      agentPolicyId = await createAgentPolicy(supertest);
    });

    after(async () => {
      await mockIacProvisioner.stop();
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    beforeEach(() => {
      mockIacProvisioner.reset();
    });

    /** A connector with the test package attached, keyed or keyless. */
    const createConnectorWithPolicy = async (iacFields: { iac_key?: string } = {}) => {
      const cloudConnectorId = await createAwsCloudConnector(supertest, {
        ...iacFields,
        ...(iacFields.iac_key
          ? { iac_blueprint_id: 'aws-federated-identity', iac_blueprint_version: '1.0.0' }
          : {}),
      });
      await attachTestPackagePolicy(supertest, { agentPolicyId, cloudConnectorId });
      return cloudConnectorId;
    };

    describe('request validation', () => {
      it('returns 404 for an unknown cloud connector', async () => {
        const { body } = await verify('this-connector-does-not-exist').expect(404);

        expect(body.message).to.contain('this-connector-does-not-exist');
        expect(mockIacProvisioner.getRequests()).to.have.length(0);
      });

      it('returns 400 for an unknown body key', async () => {
        const cloudConnectorId = await createAwsCloudConnector(supertest);

        await verify(cloudConnectorId, { unexpected: true }).expect(400);
      });

      it('returns 400 when more integrations than the render limit are sent', async () => {
        const cloudConnectorId = await createAwsCloudConnector(supertest);

        await verify(cloudConnectorId, {
          integrations: integrationsOverCap(MAX_IAC_RENDER_INTEGRATIONS),
        }).expect(400);
        expect(mockIacProvisioner.getRequests()).to.have.length(0);
      });
    });

    describe('compare: false', () => {
      it('returns the connector integration set as not_checked without asking the provisioner', async () => {
        const cloudConnectorId = await createConnectorWithPolicy();

        const { body } = await verify(cloudConnectorId, { compare: false }).expect(200);

        expect(body).to.eql({
          matches: true,
          outcome: 'not_checked',
          integrations: TEST_PACKAGE_INTEGRATION_SET,
        });
        expect(mockIacProvisioner.getRequests()).to.have.length(0);
        expect(await getCloudConnector(supertest, cloudConnectorId)).to.not.have.property(
          'iac_upgrade_status'
        );
      });
    });

    describe('outcomes that settle inside Kibana', () => {
      it('reports no_integrations for a connector without package policies', async () => {
        const cloudConnectorId = await createAwsCloudConnector(supertest, {
          iac_key: STORED_IAC_KEY,
        });

        const { body } = await verify(cloudConnectorId).expect(200);

        expect(body).to.eql({ matches: true, outcome: 'no_integrations', integrations: [] });
        expect(mockIacProvisioner.getRequests()).to.have.length(0);
        expect(await getCloudConnector(supertest, cloudConnectorId)).to.not.have.property(
          'iac_upgrade_status'
        );
      });

      it('reports unsupported_provider for a non-AWS connector', async () => {
        const cloudConnectorId = await createAzureCloudConnector(supertest);

        const { body } = await verify(cloudConnectorId).expect(200);

        expect(body.outcome).to.be('unsupported_provider');
        expect(body.matches).to.be(true);
        expect(mockIacProvisioner.getRequests()).to.have.length(0);
      });

      it('reports no_key for a keyless connector and stores upgrade_available', async () => {
        const cloudConnectorId = await createConnectorWithPolicy();

        const { body } = await verify(cloudConnectorId).expect(200);

        expect(body).to.eql({
          matches: false,
          reason: 'no_key',
          outcome: 'no_key',
          integrations: TEST_PACKAGE_INTEGRATION_SET,
        });
        // The static template is known to be deployed, so there is nothing to compare.
        expect(mockIacProvisioner.getRequests()).to.have.length(0);
        expect((await getCloudConnector(supertest, cloudConnectorId)).iac_upgrade_status).to.be(
          'upgrade_available'
        );
      });
    });

    describe('comparison against the IaC Provisioner', () => {
      it('reports matches and stores up_to_date when the provisioner does not need a render', async () => {
        const cloudConnectorId = await createConnectorWithPolicy({ iac_key: STORED_IAC_KEY });
        mockIacProvisioner.setRenderResponse({
          body: renderResponse({ render: false, templateSha: STORED_IAC_KEY }),
        });

        const { body } = await verify(cloudConnectorId).expect(200);

        expect(body).to.eql({
          matches: true,
          outcome: 'matches',
          integrations: TEST_PACKAGE_INTEGRATION_SET,
        });

        const requests = mockIacProvisioner.getRequests();
        expect(requests).to.have.length(1);
        expect(requests[0].method).to.be('POST');
        expect(requests[0].url).to.be(IAC_PROVISIONER_RENDER_PATH);
        expect(requests[0].body).to.eql({
          provider: 'aws',
          workflow: 'federated_identity',
          integrations: TEST_PACKAGE_PROVISIONER_INTEGRATIONS,
          templateSha: STORED_IAC_KEY,
        });

        expect((await getCloudConnector(supertest, cloudConnectorId)).iac_upgrade_status).to.be(
          'up_to_date'
        );
      });

      it('reports key_mismatch and stores upgrade_available when the provisioner needs a render', async () => {
        const cloudConnectorId = await createConnectorWithPolicy({ iac_key: STORED_IAC_KEY });
        mockIacProvisioner.setRenderResponse({
          body: renderResponse({
            render: true,
            templateSha: 'sha256:newer-template',
            artifactUrl: 'https://artifacts.example.com/template.yaml?signature=secret',
            expiresAt: '2030-01-01T00:00:00Z',
          }),
        });

        const { body } = await verify(cloudConnectorId).expect(200);

        expect(body).to.eql({
          matches: false,
          reason: 'key_mismatch',
          outcome: 'key_mismatch',
          integrations: TEST_PACKAGE_INTEGRATION_SET,
        });
        expect(mockIacProvisioner.getRequests()).to.have.length(1);
        expect((await getCloudConnector(supertest, cloudConnectorId)).iac_upgrade_status).to.be(
          'upgrade_available'
        );
      });

      it('fails open as key_unavailable and keeps the stored status when the provisioner errors', async () => {
        const cloudConnectorId = await createConnectorWithPolicy({ iac_key: STORED_IAC_KEY });
        // Establish a known stored status first.
        await verify(cloudConnectorId).expect(200);
        expect((await getCloudConnector(supertest, cloudConnectorId)).iac_upgrade_status).to.be(
          'up_to_date'
        );

        mockIacProvisioner.reset();
        mockIacProvisioner.setRenderResponse({
          status: 500,
          body: { code: 'internal_error', message: 'render backend unavailable' },
        });

        const { body } = await verify(cloudConnectorId).expect(200);

        expect(body).to.eql({
          matches: true,
          outcome: 'key_unavailable',
          integrations: TEST_PACKAGE_INTEGRATION_SET,
        });
        expect(mockIacProvisioner.getRequests()).to.have.length(1);
        expect((await getCloudConnector(supertest, cloudConnectorId)).iac_upgrade_status).to.be(
          'up_to_date'
        );
      });

      it('computes the outcome for added integrations without storing it (onboarding shape)', async () => {
        const cloudConnectorId = await createConnectorWithPolicy({ iac_key: STORED_IAC_KEY });
        // Establish a known stored status first.
        await verify(cloudConnectorId).expect(200);
        expect((await getCloudConnector(supertest, cloudConnectorId)).iac_upgrade_status).to.be(
          'up_to_date'
        );

        mockIacProvisioner.reset();
        mockIacProvisioner.setRenderResponse({
          body: renderResponse({ render: true, templateSha: 'sha256:with-added-package' }),
        });

        const { body } = await verify(cloudConnectorId, {
          integrations: [ADDED_PACKAGE_INTEGRATION],
        }).expect(200);

        // The returned set is the connector's policies merged with the added integration, and the
        // provisioner was asked about exactly that merged set.
        const mergedSet = [...TEST_PACKAGE_INTEGRATION_SET, ADDED_PACKAGE_INTEGRATION];
        expect(body).to.eql({
          matches: false,
          reason: 'key_mismatch',
          outcome: 'key_mismatch',
          integrations: mergedSet,
        });
        const requests = mockIacProvisioner.getRequests();
        expect(requests).to.have.length(1);
        expect(
          (requests[0].body.integrations as Array<{ name: string }>).map(({ name }) => name)
        ).to.eql(mergedSet.map(({ name }) => name));

        // An onboarding check carries integrations the user has not saved yet, so its verdict
        // must not overwrite the stored status.
        expect((await getCloudConnector(supertest, cloudConnectorId)).iac_upgrade_status).to.be(
          'up_to_date'
        );
      });
    });
  });
}
