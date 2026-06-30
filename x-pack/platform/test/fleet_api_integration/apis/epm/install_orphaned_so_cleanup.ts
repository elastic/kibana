/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Client } from '@elastic/elasticsearch';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';

const PKG_NAME = 'all_assets';
const PKG_VERSION = '0.1.0';
// Archive ID of the tag SO embedded in all_assets 0.1.0 (kibana/tag/sample_tag.json)
const TAG_ARCHIVE_ID = 'sample_tag';
const TEST_SPACE = 'fleet-orphan-test-space';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es: Client = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  // Install in the given space (defaults to the default space).
  const installPackage = (spaceId?: string) =>
    supertest
      .post(
        spaceId
          ? `/s/${spaceId}/api/fleet/epm/packages/${PKG_NAME}/${PKG_VERSION}`
          : `/api/fleet/epm/packages/${PKG_NAME}/${PKG_VERSION}`
      )
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });

  // Uninstall always goes through the default-space endpoint — Fleet tracks packages
  // globally in the ingest index, so the space used for install doesn't matter here.
  const uninstallPackage = () =>
    supertest
      .delete(`/api/fleet/epm/packages/${PKG_NAME}/${PKG_VERSION}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });

  const createSpace = (spaceId: string) =>
    supertest
      .post('/api/spaces/space')
      .set('kbn-xsrf', 'xxxx')
      .send({ name: spaceId, id: spaceId, initials: 's', color: '#D6BF57', disabledFeatures: [] });

  const deleteSpace = (spaceId: string) =>
    supertest.delete(`/api/spaces/space/${spaceId}`).set('kbn-xsrf', 'xxxx');

  /**
   * Injects a tag SO directly into .kibana with originId = TAG_ARCHIVE_ID.
   *
   * In the default space the ES _id is `tag:{soId}`.
   * In a non-default space it is `{spaceId}:tag:{soId}`, and the document carries
   * `namespaces: [spaceId]`.  This mirrors how the SO importer stores multiple-isolated
   * types after a real (but failed) install attempt.
   *
   * Two such orphans sharing the same originId trigger the ambiguous_conflict error on
   * the next import; the fix deletes them before the import runs.
   */
  const injectOrphanedTag = async (soId: string, spaceId = 'default') => {
    const esId = spaceId === 'default' ? `tag:${soId}` : `${spaceId}:tag:${soId}`;
    await es.index({
      index: '.kibana',
      id: esId,
      refresh: 'wait_for',
      document: {
        type: 'tag',
        tag: { name: `fleet-test-orphan-${soId}`, description: '', color: '#000000' },
        originId: TAG_ARCHIVE_ID,
        namespaces: [spaceId],
        managed: false,
        references: [],
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    });
  };

  const deleteOrphanedTag = async (soId: string, spaceId = 'default') => {
    const esId = spaceId === 'default' ? `tag:${soId}` : `${spaceId}:tag:${soId}`;
    await es.delete({ index: '.kibana', id: esId, refresh: 'wait_for' }).catch(() => {});
  };

  const orphanExists = async (soId: string, spaceId = 'default') => {
    const esId = spaceId === 'default' ? `tag:${soId}` : `${spaceId}:tag:${soId}`;
    return es.exists({ index: '.kibana', id: esId }).catch(() => false);
  };

  describe('Orphaned multiple-isolated SO cleanup during package install', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    describe('in the default space', () => {
      afterEach(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage();
        await deleteOrphanedTag('fleet-orphan-test-1');
        await deleteOrphanedTag('fleet-orphan-test-2');
      });

      it('succeeds on a fresh install when two orphaned tag SOs from prior failed installs share the same originId', async () => {
        // Inject two orphaned copies of sample_tag (simulates two separate failed installs,
        // each of which allocated a new UUID before failing).  Without the fix these two
        // objects cause an ambiguous_conflict when the SO importer tries to resolve the
        // origin query ("tag:sample_tag" | "sample_tag") and finds two destinations.
        await injectOrphanedTag('fleet-orphan-test-1');
        await injectOrphanedTag('fleet-orphan-test-2');

        const response = await installPackage();
        expect(response.status).to.be(200);
      });

      it('removes injected orphan SOs during a successful install', async () => {
        await injectOrphanedTag('fleet-orphan-test-1');
        await injectOrphanedTag('fleet-orphan-test-2');

        await installPackage().expect(200);

        expect(await orphanExists('fleet-orphan-test-1')).to.be(false);
        expect(await orphanExists('fleet-orphan-test-2')).to.be(false);
      });

      it('succeeds on reinstall when an orphaned tag SO from a prior failed reinstall is present', async () => {
        // First install succeeds and tracks the tag in installed_kibana
        await installPackage().expect(200);

        // Inject a second copy of sample_tag (simulates a failed reinstall that allocated a
        // new UUID but did not finish saving refs).  This creates the ambiguous_conflict
        // condition: the importer finds both the tracked tag and the orphan.
        await injectOrphanedTag('fleet-orphan-test-1');

        const reinstallResponse = await installPackage();
        expect(reinstallResponse.status).to.be(200);
      });

      it('removes the orphaned SO left by a failed reinstall', async () => {
        await installPackage().expect(200);
        await injectOrphanedTag('fleet-orphan-test-1');

        await installPackage().expect(200);

        expect(await orphanExists('fleet-orphan-test-1')).to.be(false);
      });
    });

    describe('in a non-default space', () => {
      before(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await createSpace(TEST_SPACE).expect(200);
      });

      after(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await deleteSpace(TEST_SPACE);
      });

      afterEach(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage();
        await deleteOrphanedTag('fleet-orphan-test-1', TEST_SPACE);
        await deleteOrphanedTag('fleet-orphan-test-2', TEST_SPACE);
        // Also clean up any default-space orphans injected by cross-space isolation tests.
        await deleteOrphanedTag('fleet-orphan-test-1');
      });

      it('succeeds on a fresh install when two orphaned tag SOs share the same originId in the target space', async () => {
        await injectOrphanedTag('fleet-orphan-test-1', TEST_SPACE);
        await injectOrphanedTag('fleet-orphan-test-2', TEST_SPACE);

        const response = await installPackage(TEST_SPACE);
        expect(response.status).to.be(200);
      });

      it('removes orphaned tag SOs scoped to the target space during install', async () => {
        await injectOrphanedTag('fleet-orphan-test-1', TEST_SPACE);
        await injectOrphanedTag('fleet-orphan-test-2', TEST_SPACE);

        await installPackage(TEST_SPACE).expect(200);

        expect(await orphanExists('fleet-orphan-test-1', TEST_SPACE)).to.be(false);
        expect(await orphanExists('fleet-orphan-test-2', TEST_SPACE)).to.be(false);
      });

      it('does not delete orphaned tag SOs that belong to a different space', async () => {
        // Orphan is in the default space; install runs in TEST_SPACE.
        // The cleanup must be scoped to TEST_SPACE only and must not touch other namespaces.
        await injectOrphanedTag('fleet-orphan-test-1');

        await installPackage(TEST_SPACE).expect(200);

        // The default-space orphan must still be present — the install in TEST_SPACE
        // must not have deleted it.
        expect(await orphanExists('fleet-orphan-test-1')).to.be(true);
      });

      it('succeeds on reinstall when an orphaned tag SO from a prior failed reinstall is present in the space', async () => {
        await installPackage(TEST_SPACE).expect(200);
        await injectOrphanedTag('fleet-orphan-test-1', TEST_SPACE);

        const reinstallResponse = await installPackage(TEST_SPACE);
        expect(reinstallResponse.status).to.be(200);
      });

      it('removes the orphaned SO left by a failed reinstall in the space', async () => {
        await installPackage(TEST_SPACE).expect(200);
        await injectOrphanedTag('fleet-orphan-test-1', TEST_SPACE);

        await installPackage(TEST_SPACE).expect(200);

        expect(await orphanExists('fleet-orphan-test-1', TEST_SPACE)).to.be(false);
      });
    });
  });
}
