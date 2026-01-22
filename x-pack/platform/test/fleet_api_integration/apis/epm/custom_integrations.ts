/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');
  const log = getService('log');

  const testCustomIntegrationName = 'test-custom-integration';

  // Helper functions
  const createCustomIntegration = async (
    name: string,
    datasets: Array<{ type: string; name: string }> = []
  ) => {
    return await supertest
      .post('/api/fleet/epm/custom_integrations')
      .set('kbn-xsrf', 'xxxx')
      .send({
        integrationName: name,
        force: true,
        datasets: datasets.length ? datasets : [{ type: 'logs', name }],
      })
      .expect(200);
  };

  const deleteCustomIntegration = async (name: string, version: string) => {
    await supertest
      .delete(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  const getCustomIntegrationInfo = async (name: string, version?: string) => {
    const url = version
      ? `/api/fleet/epm/packages/${name}/${version}`
      : `/api/fleet/epm/packages/${name}`;
    return await supertest.get(url).set('kbn-xsrf', 'xxxx').expect(200);
  };

  describe('EPM - Custom Integrations', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    describe('update custom integration', () => {
      let initialVersion: string;

      beforeEach(async () => {
        // Create a custom integration to update
        await createCustomIntegration(testCustomIntegrationName);
        // Store the initial version to verify it changes after update
        const getResponse = await getCustomIntegrationInfo(testCustomIntegrationName);
        initialVersion = getResponse.body.item.version;
      });

      afterEach(async () => {
        // Get current version after tests
        const getResponse = await getCustomIntegrationInfo(testCustomIntegrationName);
        const currentVersion = getResponse.body.item.version;
        // Clean up
        try {
          await deleteCustomIntegration(testCustomIntegrationName, currentVersion);
        } catch (err) {
          log.info(`Error cleaning up custom integration: ${err.message}`);
        }
      });

      it('should update readme and increment version', async () => {
        // Define new readme content
        const newReadmeContent =
          '# Updated Test Integration\nThis readme has been updated through the API.';

        // Update the custom integration
        await supertest
          .put(`/api/fleet/epm/custom_integrations/${testCustomIntegrationName}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            readMeData: newReadmeContent,
          })
          .expect(200);

        // Verify the integration was updated with new version
        const response = await getCustomIntegrationInfo(testCustomIntegrationName);
        const updatedIntegration = response.body.item;

        // Version should be incremented
        const parsedInitialVersion = initialVersion.split('.');
        const expectedNewVersion = `${parsedInitialVersion[0]}.${parsedInitialVersion[1]}.${
          Number(parsedInitialVersion[2]) + 1
        }`;

        expect(updatedIntegration.version).to.not.equal(initialVersion);
        expect(updatedIntegration.version).to.equal(expectedNewVersion);

        // Get the readme file to verify content
        const readmeResponse = await supertest
          .get(
            `/api/fleet/epm/packages/${testCustomIntegrationName}/${expectedNewVersion}/docs/README.md`
          )
          .expect(200);
        // The response body contains the raw file content, verify it matches the new content
        expect(readmeResponse.text).to.equal(newReadmeContent);
      });

      it('should allow to update readme with an empty string and increment version', async () => {
        // Define new readme content
        const newReadmeContent = '';

        // Update the custom integration
        await supertest
          .put(`/api/fleet/epm/custom_integrations/${testCustomIntegrationName}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            readMeData: newReadmeContent,
          })
          .expect(200);

        // Verify the integration was updated with new version
        const response = await getCustomIntegrationInfo(testCustomIntegrationName);
        const updatedIntegration = response.body.item;

        // Version should be incremented
        const parsedInitialVersion = initialVersion.split('.');
        const expectedNewVersion = `${parsedInitialVersion[0]}.${parsedInitialVersion[1]}.${
          Number(parsedInitialVersion[2]) + 1
        }`;

        expect(updatedIntegration.version).to.not.equal(initialVersion);
        expect(updatedIntegration.version).to.equal(expectedNewVersion);

        // Get the readme file to verify content
        const readmeResponse = await supertest
          .get(
            `/api/fleet/epm/packages/${testCustomIntegrationName}/${expectedNewVersion}/docs/README.md`
          )
          .expect(200);
        // The response body contains the raw file content, verify it matches the new content
        expect(readmeResponse.text).to.equal(newReadmeContent);
      });

      it('should return 404 for non-existent integration', async () => {
        await supertest
          .put(`/api/fleet/epm/custom_integrations/non-existent-integration`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            readMeData: 'New content',
          })
          .expect(404);
      });
    });
  });
}
