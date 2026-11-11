/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import JSZip from 'jszip';
import expect from '@kbn/expect';
import { INGEST_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupTestUsers, testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');
  const retry = getService('retry');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');

  const privilegeTestPkgName = 'preflight_authz_test';
  const privilegeTestPkgVersion = '1.0.0';

  async function buildPackageZipWithAssetType(
    assetType: string,
    assetContent: object
  ): Promise<Buffer> {
    const pkgKey = `${privilegeTestPkgName}-${privilegeTestPkgVersion}`;
    const zip = new JSZip();
    zip.file(
      `${pkgKey}/manifest.yml`,
      [
        `name: ${privilegeTestPkgName}`,
        `title: Preflight Authz Test`,
        `version: ${privilegeTestPkgVersion}`,
        `description: Test package for preflight authz checks`,
        `type: integration`,
        `format_version: 1.0.0`,
        `categories: []`,
        `conditions:`,
        `  kibana.version: "^8.0.0"`,
        `owner:`,
        `  github: elastic/fleet`,
      ].join('\n')
    );
    zip.file(`${pkgKey}/kibana/${assetType}/test-asset.json`, JSON.stringify(assetContent));
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    return buffer;
  }

  describe('Upload preflight asset privilege checks', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
      await setupTestUsers(security);
    });

    beforeEach(async () => {
      // Wait until the process-wide upload rate-limit (10 s) has expired before each test.
      // The probe uses a deliberately invalid zip so it always fails before
      // setLastUploadInstallCache() is reached — each probe leaves the slot unchanged.
      // retry.tryForTime throws on 429 and succeeds on any other status, so the hook
      // unblocks as soon as the window clears.
      const probe = Buffer.from('not-a-zip');
      await retry.tryForTime(15_000, async () => {
        const { status } = await supertest
          .post('/api/fleet/epm/packages')
          .set('kbn-xsrf', 'xxxx')
          .type('application/zip')
          .send(probe);
        if (status === 429) {
          throw new Error('Upload rate limit still active');
        }
      });
    });

    afterEach(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/${privilegeTestPkgName}/${privilegeTestPkgVersion}`)
        .set('kbn-xsrf', 'xxxx');
    });

    it('rejects upload of package with security_ai_prompt asset for Fleet-only user — 403', async () => {
      const aiPromptAsset = {
        id: 'test-prompt-id',
        type: 'security-ai-prompt',
        attributes: { name: 'Test Prompt', content: 'You are a security assistant.' },
      };
      const buf = await buildPackageZipWithAssetType('security_ai_prompt', aiPromptAsset);

      await supertestWithoutAuth
        .post(`/api/fleet/epm/packages`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(403);
    });

    it('rejects upload of package with security_rule asset for Fleet-only user — 403 before any install writes', async () => {
      const securityRuleAsset = {
        id: 'test-rule-id',
        type: 'security-rule',
        attributes: {
          name: 'Test Rule',
          type: 'query',
          query: 'event.action: *',
          language: 'kuery',
          enabled: false,
          risk_score: 50,
          severity: 'medium',
          version: 1,
        },
      };
      const buf = await buildPackageZipWithAssetType('security_rule', securityRuleAsset);

      await supertestWithoutAuth
        .post(`/api/fleet/epm/packages`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(403);

      // Verify no install state was written — the preflight check must have fired
      // before any saved object or package-install records were created.
      const installRecord = await esClient.search({
        index: INGEST_SAVED_OBJECT_INDEX,
        size: 0,
        rest_total_hits_as_int: true,
        query: {
          bool: {
            filter: [{ term: { 'epm-packages.name': privilegeTestPkgName } }],
          },
        },
      });
      expect(installRecord.hits.total).to.equal(0);
    });

    it('allows upload of package with security_rule asset for user with Fleet + SIEM all — 200', async () => {
      const securityRuleAsset = {
        id: 'test-rule-id',
        type: 'security-rule',
        attributes: {
          rule_id: 'test-rule-ok',
          name: 'Test Rule',
          type: 'query',
          query: 'event.action: *',
          language: 'kuery',
          enabled: false,
          risk_score: 50,
          severity: 'medium',
          version: 1,
        },
      };
      const buf = await buildPackageZipWithAssetType('security_rule', securityRuleAsset);

      await supertestWithoutAuth
        .post(`/api/fleet/epm/packages`)
        .auth(
          testUsers.fleet_all_int_all_siem_all.username,
          testUsers.fleet_all_int_all_siem_all.password
        )
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);
    });

    it('allows upload of package with security_ai_prompt asset for user with Fleet + elasticAssistant — 200', async () => {
      const aiPromptAsset = {
        id: 'test-prompt-id-ok',
        type: 'security-ai-prompt',
        attributes: { name: 'Test Prompt', content: 'You are a security assistant.' },
      };
      const buf = await buildPackageZipWithAssetType('security_ai_prompt', aiPromptAsset);

      await supertestWithoutAuth
        .post(`/api/fleet/epm/packages`)
        .auth(
          testUsers.fleet_all_int_all_assistant_all.username,
          testUsers.fleet_all_int_all_assistant_all.password
        )
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);
    });

    it('allows upload of ML security_rule asset for user with Fleet + SIEM + ML all — 200', async () => {
      const mlRuleAsset = {
        id: 'test-ml-rule-id-ok',
        type: 'security-rule',
        attributes: {
          rule_id: 'test-ml-rule-ok',
          name: 'Test ML Rule',
          type: 'machine_learning',
          machine_learning_job_id: 'test-ml-job',
          anomaly_threshold: 50,
          enabled: false,
          risk_score: 50,
          severity: 'medium',
          version: 1,
        },
      };
      const buf = await buildPackageZipWithAssetType('security_rule', mlRuleAsset);

      await supertestWithoutAuth
        .post(`/api/fleet/epm/packages`)
        .auth(
          testUsers.fleet_all_int_all_siem_all_ml_all.username,
          testUsers.fleet_all_int_all_siem_all_ml_all.password
        )
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);
    });

    it('rejects upload of ML security_rule for rules-only user (missing ml:canCreateJob) — 403', async () => {
      const mlRuleAsset = {
        id: 'test-ml-rule-id-deny',
        type: 'security-rule',
        attributes: {
          rule_id: 'test-ml-rule-deny',
          name: 'Test ML Rule Deny',
          type: 'machine_learning',
          machine_learning_job_id: 'test-ml-job-deny',
          anomaly_threshold: 50,
          enabled: false,
          risk_score: 50,
          severity: 'medium',
          version: 1,
        },
      };
      const buf = await buildPackageZipWithAssetType('security_rule', mlRuleAsset);

      // fleet_all_int_all_siem_all has rules-all (via siemV5:all) but not ml:canCreateJob
      await supertestWithoutAuth
        .post(`/api/fleet/epm/packages`)
        .auth(
          testUsers.fleet_all_int_all_siem_all.username,
          testUsers.fleet_all_int_all_siem_all.password
        )
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(403);
    });

    // Verifies the multi-Space destination boundary: when a package was previously installed in
    // additional Spaces, uploading in the primary Space must check gated-asset privileges for all
    // destination Spaces, not just the request Space.
    describe('multi-Space destination authz', () => {
      const extraSpace = 'preflight-authz-extra';

      const securityRuleAsset = {
        id: 'test-rule-multispace',
        type: 'security-rule',
        attributes: {
          rule_id: 'test-rule-multispace',
          name: 'Test Rule Multispace',
          type: 'query',
          query: 'event.action: *',
          language: 'kuery',
          enabled: false,
          risk_score: 50,
          severity: 'medium',
          version: 1,
        },
      };

      beforeEach(async () => {
        // Pre-seed an install record that already has a security_rule ref in an additional Space.
        // This simulates a package previously installed into both default and the extra Space so
        // the preflight check must verify privileges for both destination Spaces.
        await kibanaServer.savedObjects.create({
          type: 'epm-packages',
          id: privilegeTestPkgName,
          overwrite: true,
          attributes: {
            name: privilegeTestPkgName,
            version: privilegeTestPkgVersion,
            install_status: 'installed',
            install_version: privilegeTestPkgVersion,
            install_started_at: new Date().toISOString(),
            install_source: 'upload',
            verification_status: 'unknown',
            installed_kibana_space_id: 'default',
            installed_kibana: [],
            installed_es: [],
            package_assets: [],
            additional_spaces_installed_kibana: {
              [extraSpace]: [{ id: 'pre-existing-rule', type: 'security-rule' }],
            },
          },
        });
      });

      it('rejects upload when caller lacks rules-all in destination additional Space — 403', async () => {
        const buf = await buildPackageZipWithAssetType('security_rule', securityRuleAsset);

        // fleet_all_int_all_siem_default_only has siemV5:all scoped to [default] only,
        // so it lacks rules-all in the extra Space where the existing rule ref lives.
        await supertestWithoutAuth
          .post('/api/fleet/epm/packages')
          .auth(
            testUsers.fleet_all_int_all_siem_default_only.username,
            testUsers.fleet_all_int_all_siem_default_only.password
          )
          .set('kbn-xsrf', 'xxxx')
          .type('application/zip')
          .send(buf)
          .expect(403);
      });

      it('allows upload when caller has rules-all in all destination Spaces — 200', async () => {
        const buf = await buildPackageZipWithAssetType('security_rule', securityRuleAsset);

        // fleet_all_int_all_siem_all has siemV5:all in spaces: ['*'] — covers the extra Space too.
        await supertestWithoutAuth
          .post('/api/fleet/epm/packages')
          .auth(
            testUsers.fleet_all_int_all_siem_all.username,
            testUsers.fleet_all_int_all_siem_all.password
          )
          .set('kbn-xsrf', 'xxxx')
          .type('application/zip')
          .send(buf)
          .expect(200);
      });
    });
  });
}
