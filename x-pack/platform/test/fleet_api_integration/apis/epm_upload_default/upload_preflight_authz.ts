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
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

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
      // Poll until the process-wide upload rate-limit (10 s) has expired.
      // The probe uses a deliberately invalid zip so it fails before the
      // setLastUploadInstallCache() call — each probe leaves the rate-limit
      // slot unchanged. A 429 means the window is still open; any other status
      // means it has cleared and we can proceed.
      const probe = Buffer.from('not-a-zip');
      for (let i = 0; i < 15; i++) {
        const { status } = await supertest
          .post('/api/fleet/epm/packages')
          .set('kbn-xsrf', 'xxxx')
          .type('application/zip')
          .send(probe);
        if (status !== 429) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
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
  });
}
