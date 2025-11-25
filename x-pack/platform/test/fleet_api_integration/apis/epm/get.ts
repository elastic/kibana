/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { PackageInfo } from '@kbn/fleet-plugin/common/types/models/epm';
import fs from 'fs';
import path from 'path';
import pRetry from 'p-retry';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';
import { bundlePackage, removeBundledPackages } from './install_bundled';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const fleetAndAgents = getService('fleetAndAgents');

  const testPkgName = 'apache';
  const testPkgVersion = '0.1.4';
  const log = getService('log');

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
    await pRetry(
      async () => {
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
      },
      {
        retries: 12, // 12 retries * 5 seconds = 60 seconds max
        minTimeout: 5000, // 5 seconds between retries
        maxTimeout: 5000,
      }
    );
  };

  // Helper function to wait for knowledge base items to appear in package info
  const waitForKnowledgeBaseInPackageInfo = async (packageName: string, packageVersion: string) => {
    await pRetry(
      async () => {
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
      },
      {
        retries: 12, // 12 retries * 5 seconds = 60 seconds max
        minTimeout: 5000, // 5 seconds between retries
        maxTimeout: 5000,
      }
    );
  };

  const testPkgArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_0.1.4.zip'
  );

  async function uploadPackage(zipPackage: string) {
    // wait 10s before uploading again to avoid getting 429
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const buf = fs.readFileSync(zipPackage);
    return await supertest
      .post(`/api/fleet/epm/packages`)
      .set('kbn-xsrf', 'xxxx')
      .type('application/zip')
      .send(buf)
      .expect(200);
  }

  describe('EPM - get', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    it('returns package info from the registry if it was installed from the registry', async function () {
      // this will install through the registry by default
      await installPackage(testPkgName, testPkgVersion);
      const res = await supertest
        .get(`/api/fleet/epm/packages/${testPkgName}/${testPkgVersion}`)
        .expect(200);
      const packageInfo = res.body.item;
      // the uploaded version will have this description
      expect(packageInfo.description).to.not.equal('Apache Uploaded Test Integration');
      // download property should exist
      expect(packageInfo.download).to.not.equal(undefined);
      await uninstallPackage(testPkgName, testPkgVersion);
    });

    it('returns correct package info if it was installed by upload', async function () {
      await uploadPackage(testPkgArchiveZip);

      const res = await supertest
        .get(`/api/fleet/epm/packages/${testPkgName}/${testPkgVersion}`)
        .expect(200);
      const packageInfo = res.body.item;
      // Get package info always return data from the registry
      expect(packageInfo.description).to.not.equal('Apache Uploaded Test Integration');
      // download property exist on uploaded packages
      expect(packageInfo.download).to.not.equal(undefined);
      await uninstallPackage(testPkgName, testPkgVersion);
    });

    it('returns correct package info from registry if a different version is installed by upload', async function () {
      await uploadPackage(testPkgArchiveZip);

      const res = await supertest.get(`/api/fleet/epm/packages/apache/0.1.3`).expect(200);
      const packageInfo = res.body.item;
      expect(packageInfo.description).to.equal('Apache Integration');
      expect(packageInfo.download).to.not.equal(undefined);
      await uninstallPackage(testPkgName, testPkgVersion);
    });

    it('returns correct package info from upload if a uploaded version is not in registry', async function () {
      const testPkgArchiveZipV9999 = path.join(
        path.dirname(__filename),
        '../fixtures/direct_upload_packages/apache_9999.0.0.zip'
      );
      await uploadPackage(testPkgArchiveZipV9999);

      const res = await supertest.get(`/api/fleet/epm/packages/apache/9999.0.0`).expect(200);
      const packageInfo = res.body.item;
      expect(packageInfo.description).to.equal('Apache Uploaded Test Integration');
      expect(packageInfo.download).to.equal(undefined);
      await uninstallPackage(testPkgName, '9999.0.0');
    });

    describe('Installed Packages', () => {
      before(async () => {
        await installPackage(testPkgName, testPkgVersion);
        await installPackage('experimental', '0.1.0');
        await bundlePackage('endpoint-8.6.1');
        await installPackage('endpoint', '8.6.1');
        await es.index({
          index: 'logs-apache.access-default',
          document: {
            '@timestamp': new Date().toISOString(),
          },
          refresh: 'wait_for',
        });
      });
      after(async () => {
        await uninstallPackage(testPkgName, testPkgVersion);
        await uninstallPackage('experimental', '0.1.0');
        await uninstallPackage('endpoint', '8.6.1');
        await removeBundledPackages(log);
        await es.indices.deleteDataStream({
          name: 'logs-apache.access-default',
        });
      });
      it('Allows the fetching of installed packages', async () => {
        const res = await supertest.get(`/api/fleet/epm/packages/installed`).expect(200);
        const packages = res.body.items;
        const packageNames = packages.map((pkg: any) => pkg.name);
        expect(packageNames).to.contain('apache');
        expect(packageNames).to.contain('endpoint');
        expect(packageNames).to.contain('experimental');
        expect(packageNames.length).to.be(3);
      });
      it('Can be limited with perPage', async () => {
        const res = await supertest.get(`/api/fleet/epm/packages/installed?perPage=2`).expect(200);
        const packages = res.body.items;
        expect(packages.length).to.be(2);
      });
      it('Can be queried by dataStreamType', async () => {
        const res = await supertest
          .get(`/api/fleet/epm/packages/installed?dataStreamType=metrics`)
          .expect(200);
        const packages = res.body.items;
        let dataStreams = [] as any;
        packages.forEach((packageItem: any) => {
          dataStreams = dataStreams.concat(packageItem.dataStreams);
        });
        const streamsWithWrongType = dataStreams.filter((stream: any) => {
          return !stream.name.startsWith('metrics-');
        });
        expect(streamsWithWrongType.length).to.be(0);
      });
      it('Can be sorted', async () => {
        const ascRes = await supertest
          .get(`/api/fleet/epm/packages/installed?sortOrder=asc`)
          .expect(200);
        const ascPackages = ascRes.body.items;
        expect(ascPackages[0].name).to.be('apache');

        const descRes = await supertest
          .get(`/api/fleet/epm/packages/installed?sortOrder=desc`)
          .expect(200);
        const descPackages = descRes.body.items;
        expect(descPackages[0].name).to.be('experimental');
      });
      it('Can be filtered by name', async () => {
        const res = await supertest
          .get(`/api/fleet/epm/packages/installed?nameQuery=experimental`)
          .expect(200);
        const packages = res.body.items;
        expect(packages.length).to.be(1);
        expect(packages[0].name).to.be('experimental');
      });
      it('Can be to only return active datastreams', async () => {
        const res = await supertest
          .get(`/api/fleet/epm/packages/installed?nameQuery=apache&showOnlyActiveDataStreams=true`)
          .expect(200);
        const packages = res.body.items;
        expect(packages.length).to.be(1);
        expect(packages[0].name).to.be('apache');
        expect(packages[0].dataStreams.length).to.be(1);
        expect(packages[0].dataStreams[0].name).to.be('logs-apache.access-*');
      });
    });
    it('rejects user does not have access to data streams', async function () {
      const response = await supertestWithoutAuth
        .get(`/api/fleet/epm/packages/installed?showOnlyActiveDataStreams=true`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .expect(403);
      expect(response.body.message).to.contain('Unauthorized to query fleet datastreams');
    });
    it('returns a 404 for a package that do not exists', async function () {
      await supertest.get('/api/fleet/epm/packages/notexists/99.99.99').expect(404);
    });

    it('returns a 400 for a package key without a proper semver version', async function () {
      await supertest.get('/api/fleet/epm/packages/endpoint/0.1.0.1.2.3').expect(400);
    });

    it('allows user with only fleet permission to access', async () => {
      await supertestWithoutAuth
        .get(`/api/fleet/epm/packages/${testPkgName}/${testPkgVersion}`)
        .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
        .expect(200);
    });
    it('allows user with only integrations permission to access', async () => {
      await supertestWithoutAuth
        .get(`/api/fleet/epm/packages/${testPkgName}/${testPkgVersion}`)
        .auth(testUsers.integr_all_only.username, testUsers.integr_all_only.password)
        .expect(200);
    });
    it('allows user with integrations read permission to access', async () => {
      await supertestWithoutAuth
        .get(`/api/fleet/epm/packages/${testPkgName}/${testPkgVersion}`)
        .auth(testUsers.fleet_all_int_read.username, testUsers.fleet_all_int_read.password)
        .expect(200);
    });

    it('returns package info in item field when calling without version', async function () {
      // this will install through the registry by default
      await installPackage(testPkgName, testPkgVersion);
      const res = await supertest
        .get(`/api/fleet/epm/packages/${testPkgName}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      const packageInfo = res.body.item;
      // the uploaded version will have this description
      expect(packageInfo.name).to.equal('apache');
      await uninstallPackage(testPkgName, testPkgVersion);
    });
    it('should return all fields for input only packages', async function () {
      // input packages have to get their package info from the manifest directly
      // not from the package registry. This is because they contain a field the registry
      // does not support
      const res = await supertest
        .get(`/api/fleet/epm/packages/integration_to_input/2.0.0`)
        .expect(200);

      const packageInfo = res.body.item;
      expect(packageInfo.policy_templates.length).to.equal(1);
      expect(packageInfo.policy_templates[0].vars).not.to.be(undefined);
    });
    describe('Pkg verification', () => {
      it('should return validation error for unverified input only pkg', async function () {
        const res = await supertest
          .get(`/api/fleet/epm/packages/input_only/0.1.0?prerelease=true`)
          .expect(400);
        const error = res.body;

        expect(error?.attributes?.type).to.equal('verification_failed');
      });
      it('should not return validation error for unverified input only pkg if ignoreUnverified is true', async function () {
        await supertest
          .get(`/api/fleet/epm/packages/input_only/0.1.0?ignoreUnverified=true&prerelease=true`)
          .expect(200);
      });
    });
    it('returns package info from the archive if ?full=true', async function () {
      const res = await supertest
        .get(`/api/fleet/epm/packages/non_epr_fields/1.0.0?full=true`)
        .expect(200);
      const packageInfo = res.body.item as PackageInfo;
      expect(packageInfo?.data_streams?.length).equal(3);
      const dataStream = packageInfo?.data_streams?.find(
        ({ dataset }) => dataset === 'non_epr_fields.test_metrics_2'
      );
      expect(dataStream?.elasticsearch?.source_mode).equal('default');
    });
    it('returns package info from the registry if ?full=false', async function () {
      const res = await supertest
        .get(`/api/fleet/epm/packages/non_epr_fields/1.0.0?full=false`)
        .expect(200);
      const packageInfo = res.body.item as PackageInfo;
      expect(packageInfo?.data_streams?.length).equal(3);
      const dataStream = packageInfo?.data_streams?.find(
        ({ dataset }) => dataset === 'non_epr_fields.test_metrics_2'
      );
      // this field is only returned if we go to the archive
      // it is not part of the EPR API
      expect(dataStream?.elasticsearch?.source_mode).equal(undefined);
    });
    it('returns package info from the registry if ?full not provided', async function () {
      const res = await supertest
        .get(`/api/fleet/epm/packages/non_epr_fields/1.0.0?full=false`)
        .expect(200);
      const packageInfo = res.body.item as PackageInfo;
      expect(packageInfo?.data_streams?.length).equal(3);
      const dataStream = packageInfo?.data_streams?.find(
        ({ dataset }) => dataset === 'non_epr_fields.test_metrics_2'
      );
      expect(dataStream?.elasticsearch?.source_mode).equal(undefined);
    });

    // Re-enable when feature flag is on by default
    // https://github.com/elastic/kibana/issues/239796
    describe.skip('Knowledge Base', () => {
      const knowledgeBasePkgName = 'knowledge_base_test';
      const knowledgeBasePkgVersion = '1.0.0';

      afterEach(async () => {
        // Clean up knowledge base content after each test to avoid conflicts
        await cleanupKnowledgeBase(knowledgeBasePkgName);
        // Uninstall the knowledge base test package
        try {
          await uninstallPackage(knowledgeBasePkgName, knowledgeBasePkgVersion);
        } catch (error) {
          // Ignore errors if package is not installed
        }
      });

      it('returns knowledge base content for an installed package', async function () {
        await installPackage(knowledgeBasePkgName, knowledgeBasePkgVersion);
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
        expect(res.body.items).to.have.length(3); // overview, troubleshooting, configuration

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
        await installPackage(knowledgeBasePkgName, knowledgeBasePkgVersion);
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
        await installPackage(knowledgeBasePkgName, knowledgeBasePkgVersion);
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
  });
}
