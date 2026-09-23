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
  INTERNAL_ROUTE_HEADERS,
  RENDER_TEMPLATE_PATH,
  TEST_PACKAGE,
  TEST_PACKAGE_INTEGRATION_SET,
  TEST_PACKAGE_PROVISIONER_INTEGRATIONS,
  integrationsOverCap,
} from './helpers/fixtures';
import {
  IAC_PROVISIONER_RENDER_PATH,
  createMockIacProvisioner,
  renderResponse,
} from './helpers/mock_iac_provisioner_api';

/**
 * The flag-off 404 lives in the Fleet Scout suite (test/scout_iac_provisioner); this suite
 * runs with the flag on and a mocked provisioner so the proxying 200 path is exercised.
 */
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const mockIacProvisioner = createMockIacProvisioner();

  const VALID_RENDER_BODY = {
    provider: 'aws',
    workflow: 'federated_identity',
    flow: 'cloud_connector',
    integrations: TEST_PACKAGE_INTEGRATION_SET,
  };

  const render = (body: Record<string, unknown>) =>
    supertest.post(RENDER_TEMPLATE_PATH).set(INTERNAL_ROUTE_HEADERS).send(body);

  describe('POST /internal/fleet/iac_provisioner/render_template', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
      await mockIacProvisioner.start();
    });

    after(async () => {
      await mockIacProvisioner.stop();
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    beforeEach(() => {
      mockIacProvisioner.reset();
    });

    it('proxies the provisioner render response for a first render', async () => {
      const rendered = renderResponse({
        render: true,
        templateSha: 'sha256:first-render',
        artifactUrl: 'https://artifacts.example.com/template.yaml?signature=secret',
        expiresAt: '2030-01-01T00:00:00Z',
      });
      mockIacProvisioner.setRenderResponse({ body: rendered });

      const { body } = await render(VALID_RENDER_BODY).expect(200);

      expect(body).to.eql(rendered);

      const requests = mockIacProvisioner.getRequests();
      expect(requests).to.have.length(1);
      expect(requests[0].method).to.be('POST');
      expect(requests[0].url).to.be(IAC_PROVISIONER_RENDER_PATH);
      // `flow` is Kibana telemetry only; the provisioner gets the resolved package versions and
      // no templateSha on a first render.
      expect(requests[0].body).to.eql({
        provider: 'aws',
        workflow: 'federated_identity',
        integrations: TEST_PACKAGE_PROVISIONER_INTEGRATIONS,
      });
    });

    it('forwards the stored templateSha and proxies a render: false reply', async () => {
      const storedSha = 'sha256:already-deployed';
      mockIacProvisioner.setRenderResponse({
        body: renderResponse({ render: false, templateSha: storedSha }),
      });

      const { body } = await render({ ...VALID_RENDER_BODY, templateSha: storedSha }).expect(200);

      expect(body.render).to.be(false);
      expect(body.templateSha).to.be(storedSha);
      expect(body).to.not.have.property('artifactUrl');

      const requests = mockIacProvisioner.getRequests();
      expect(requests).to.have.length(1);
      expect(requests[0].body.templateSha).to.be(storedSha);
    });

    it('returns 400 when more integrations than the render limit are sent', async () => {
      await render({
        ...VALID_RENDER_BODY,
        integrations: integrationsOverCap(MAX_IAC_RENDER_INTEGRATIONS),
      }).expect(400);
      expect(mockIacProvisioner.getRequests()).to.have.length(0);
    });

    it('returns 400 for an input the package manifest does not declare', async () => {
      const { body } = await render({
        ...VALID_RENDER_BODY,
        integrations: [
          {
            name: TEST_PACKAGE.name,
            policyTemplates: [
              { name: TEST_PACKAGE.policyTemplate, enabledInputs: ['not_a_declared_input'] },
            ],
          },
        ],
      }).expect(400);

      expect(body.message).to.contain('not_a_declared_input');
      expect(mockIacProvisioner.getRequests()).to.have.length(0);
    });

    it('returns 400 for a policy template the package manifest does not declare', async () => {
      const { body } = await render({
        ...VALID_RENDER_BODY,
        integrations: [
          {
            name: TEST_PACKAGE.name,
            policyTemplates: [{ name: 'not_a_template', enabledInputs: [TEST_PACKAGE.inputType] }],
          },
        ],
      }).expect(400);

      expect(body.message).to.contain('not_a_template');
      expect(mockIacProvisioner.getRequests()).to.have.length(0);
    });

    it('returns 404 for an unknown package', async () => {
      const { body } = await render({
        ...VALID_RENDER_BODY,
        integrations: [
          {
            name: 'this_package_does_not_exist',
            policyTemplates: [{ name: 'tpl', enabledInputs: ['input'] }],
          },
        ],
      }).expect(404);

      expect(body.message).to.contain('this_package_does_not_exist');
      expect(body.message).to.not.be('IaC Provisioner is not enabled');
      expect(mockIacProvisioner.getRequests()).to.have.length(0);
    });

    it('returns 502 when the provisioner fails', async () => {
      mockIacProvisioner.setRenderResponse({
        status: 500,
        body: { code: 'internal_error', message: 'render backend unavailable' },
      });

      await render(VALID_RENDER_BODY).expect(502);
      expect(mockIacProvisioner.getRequests()).to.have.length(1);
    });
  });
}
