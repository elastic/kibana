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
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');
  const retry = getService('retry');

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (name: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  // Helper function to clean up knowledge base content
  const cleanupKnowledgeBase = async (name: string) => {
    await es.deleteByQuery({
      index: '.integration_knowledge',
      query: {
        term: { 'package_name.keyword': name },
      },
      refresh: true,
      ignore_unavailable: true,
    });
  };

  // Helper function to wait for knowledge base content to be available
  const waitForKnowledgeBaseContent = async (packageName: string) => {
    await retry.tryForTime(60000, async () => {
      const res = await supertest
        .get(`/internal/fleet/epm/packages/${packageName}/knowledge_base`)
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '1');

      if (res.status !== 200) {
        throw new Error(`Knowledge base not ready yet, status: ${res.status}`);
      }

      // Ensure we have the expected content structure
      if (!res.body?.items || !Array.isArray(res.body.items) || res.body.items.length === 0) {
        throw new Error('Knowledge base content not yet available');
      }
    });
  };

  // Helper function to wait for knowledge base items to appear in package info
  const waitForKnowledgeBaseInPackageInfo = async (packageName: string, packageVersion: string) => {
    await retry.tryForTime(60000, async () => {
      const res = await supertest.get(`/api/fleet/epm/packages/${packageName}/${packageVersion}`);

      if (res.status !== 200) {
        throw new Error(`Package info not ready yet, status: ${res.status}`);
      }

      const packageInfo = res.body.item;
      if (!packageInfo?.installationInfo?.installed_es) {
        throw new Error('Package installation info not yet available');
      }

      const knowledgeBaseItems = packageInfo.installationInfo.installed_es.filter(
        (item: any) => item.type === 'knowledge_base'
      );

      if (knowledgeBaseItems.length === 0) {
        throw new Error('Knowledge base items not yet available in package info');
      }
    });
  };

  // Failing: See https://github.com/elastic/kibana/issues/246983
  describe.skip('Knowledge Base', () => {
    skipIfNoDockerRegistry(providerContext);

    const knowledgeBasePkgName = 'knowledge_base_test';
    const knowledgeBasePkgVersion = '1.0.0';

    after(async () => {
      // Clean up knowledge base content after each test to avoid conflicts
      await cleanupKnowledgeBase(knowledgeBasePkgName);
      // Uninstall the knowledge base test package
      try {
        await uninstallPackage(knowledgeBasePkgName, knowledgeBasePkgVersion);
      } catch (error) {
        // Ignore errors if package is not installed
      }
    });

    before(async () => {
      await fleetAndAgents.setup();
      await installPackage(knowledgeBasePkgName, knowledgeBasePkgVersion);
    });

    it('returns knowledge base content for an installed package', async function () {
      //  Since KB indexing is async, wait for it to be ready before trying to fetch
      // This is due to the ML model needing to get deployed first which can take a bit
      await waitForKnowledgeBaseContent(knowledgeBasePkgName);

      const res = await supertest
        .get(`/internal/fleet/epm/packages/${knowledgeBasePkgName}/knowledge_base`)
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '1')
        .expect(200);

      expect(res.body).to.have.property('package');
      expect(res.body.package).to.have.property('name');
      expect(res.body).to.have.property('items');
      expect(res.body.package.name).to.equal(knowledgeBasePkgName);
      expect(res.body.items).to.be.an('array');
      expect(res.body.items.length).to.be.greaterThan(3); // overview, troubleshooting, configuration, readme

      // Verify the content structure
      const overviewDoc = res.body.items.find((item: any) => item.fileName === 'overview.md');
      const troubleshootingDoc = res.body.items.find(
        (item: any) => item.fileName === 'troubleshooting.md'
      );
      const configurationDoc = res.body.items.find(
        (item: any) => item.fileName === 'configuration.md'
      );

      expect(overviewDoc).to.not.be(undefined);
      expect(troubleshootingDoc).to.not.be(undefined);
      expect(configurationDoc).to.not.be(undefined);
      expect(overviewDoc.content).to.contain('Knowledge Base Test Integration Overview');
      expect(troubleshootingDoc.content).to.contain('Troubleshooting Guide');
      expect(configurationDoc.content).to.contain('Configuration Guide');
    });

    it('returns 404 for knowledge base of non-existent package', async function () {
      await supertest
        .get(`/internal/fleet/epm/packages/nonexistent/knowledge_base`)
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '1')
        .expect(404);
    });

    it('validates knowledge base content structure', async function () {
      //  Since KB indexing is async, wait for it to be ready before trying to fetch
      // This is due to the ML model needing to get deployed first which can take a bit
      await waitForKnowledgeBaseContent(knowledgeBasePkgName);
      const res = await supertest
        .get(`/internal/fleet/epm/packages/${knowledgeBasePkgName}/knowledge_base`)
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '1')
        .expect(200);

      // Validate response structure matches schema
      expect(res.body.package.name).to.be.a('string');
      expect(res.body.items).to.be.an('array');

      // Validate knowledge base content items structure
      res.body.items.forEach((item: any) => {
        expect(item).to.have.property('fileName');
        expect(item).to.have.property('content');
        expect(item).to.have.property('path');
        expect(item).to.have.property('installed_at');
        expect(item).to.have.property('version');
        expect(item.fileName).to.be.a('string');
        expect(item.content).to.be.a('string');
        expect(item.path).to.be.a('string');
        expect(item.installed_at).to.be.a('string');
        expect(item.version).to.be.a('string');
      });
    });

    it('includes knowledge base information in package info assets when fetching from the info endpoint', async function () {
      //  Since KB indexing is async, wait for knowledge base items to be ready in package info
      // This is due to the ML model needing to get deployed first which can take a bit
      await waitForKnowledgeBaseInPackageInfo(knowledgeBasePkgName, knowledgeBasePkgVersion);
      const res = await supertest
        .get(`/api/fleet/epm/packages/${knowledgeBasePkgName}/${knowledgeBasePkgVersion}`)
        .expect(200);

      const packageInfo = res.body.item;

      // Check that the installed_es field contains knowledge_base items
      expect(packageInfo.installationInfo).to.have.property('installed_es');
      expect(packageInfo.installationInfo.installed_es).to.be.an('array');

      const knowledgeBaseItems = packageInfo.installationInfo.installed_es.filter(
        (item: any) => item.type === 'knowledge_base'
      );

      // Should have knowledge base items indexed
      // Note: ALL .md files from docs/ folder are indexed (including CHANGELOG.md, INSTALL.md, etc.)
      expect(knowledgeBaseItems.length).to.be.greaterThan(0);
      // Expect: README, CHANGELOG, INSTALL, overview, troubleshooting, configuration
      expect(knowledgeBaseItems.length).to.equal(6);

      // Verify knowledge base items have correct structure with packageName-fileName format
      // IDs follow the format: packageName-fileName (e.g., "knowledge_base_test-overview.md")

      // Verify all items have the correct type and structure
      knowledgeBaseItems.forEach((item: any) => {
        expect(item).to.have.property('id');
        expect(item).to.have.property('type');
        expect(item.type).to.equal('knowledge_base');
        expect(item.id).to.be.a('string');
        expect(item.id).to.not.be.empty(); // ID should be a non-empty string
        // Verify ID follows packageName-fileName format
        expect(item.id).to.match(/^knowledge_base_test-.+\.md$/);
      });

      // Verify that expected core documentation files are present
      const expectedCoreDocumentIds = [
        'knowledge_base_test-README.md',
        'knowledge_base_test-CHANGELOG.md',
        'knowledge_base_test-INSTALL.md',
        'knowledge_base_test-overview.md',
        'knowledge_base_test-troubleshooting.md',
        'knowledge_base_test-configuration.md',
      ];

      const actualDocumentIds = knowledgeBaseItems.map((item: any) => item.id);

      // Check that all expected core docs are present
      expectedCoreDocumentIds.forEach((expectedId: string) => {
        expect(actualDocumentIds.includes(expectedId)).to.equal(true);
      });
    });
  });
}
